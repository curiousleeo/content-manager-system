"""
Niche scraper — X API v2, strict cost controls.

Cost rules enforced here:
1. User ID lookup costs $0.01/handle — cached permanently in watched_accounts.x_user_id.
   Once set, never called again for the same handle.
2. Timeline fetch costs per call — cached in watched_accounts.cached_tweets + fetched_at.
   - Same calendar day: HARD BLOCK. Returns cache regardless of trigger.
   - Auto run (auto=True): skip if fetched_at < 7 days ago, return cache.
   - Manual re-fetch (auto=False, force=True): allowed if not same day.
3. Fetch max_results=100 in a single call. No pagination ever.
4. Engagement filtering (likes threshold) done in Python after fetch, not via API params.
5. Only original posts: exclude=retweets,replies.
"""
import logging
from datetime import datetime, date

import tweepy

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.content import WatchedAccount

log = logging.getLogger(__name__)

MIN_LIKES = 5  # filter threshold applied post-fetch in Python


def _get_client(bearer_token: str | None = None) -> tweepy.Client:
    token = bearer_token or settings.x_bearer_token
    if not token:
        raise ValueError("No X bearer token configured")
    return tweepy.Client(bearer_token=token, wait_on_rate_limit=False)


def _lookup_user_id(client: tweepy.Client, handle: str) -> str:
    """Call GET /2/users/by/username/:handle. Costs $0.01 — only called when x_user_id is null."""
    resp = client.get_user(username=handle)
    if not resp.data:
        raise ValueError(f"User @{handle} not found")
    return str(resp.data.id)


def _fetch_timeline(client: tweepy.Client, user_id: str) -> list[dict]:
    """
    Call GET /2/users/:id/tweets once — max 100 original posts.
    Returns list of dicts with id, text, likes, replies, retweets, impressions.
    """
    resp = client.get_users_tweets(
        id=user_id,
        exclude=["retweets", "replies"],
        tweet_fields=["public_metrics"],
        max_results=100,
    )
    if not resp.data:
        return []

    tweets = []
    for t in resp.data:
        m = t.public_metrics or {}
        tweets.append({
            "id":          str(t.id),
            "text":        t.text,
            "likes":       m.get("like_count", 0),
            "replies":     m.get("reply_count", 0),
            "retweets":    m.get("retweet_count", 0),
            "impressions": m.get("impression_count", 0),
        })

    # Filter engagement post-hoc — never paginate to find more
    return [t for t in tweets if t["likes"] >= MIN_LIKES]


def fetch_own_timeline(client: tweepy.Client, user_id: str, handle: str = "") -> list[dict]:
    """
    Fetch the user's own recent tweets for audit.
    Tries search_recent_tweets first (different endpoint, avoids per-user billing quirks),
    falls back to get_users_tweets if search fails.
    No engagement filter — audit needs all recent tweets.
    """
    # Try search endpoint first — uses from: operator, different billing path
    if handle:
        try:
            resp = client.search_recent_tweets(
                query=f"from:{handle} -is:retweet -is:reply lang:en",
                tweet_fields=["public_metrics"],
                max_results=100,
            )
            if resp.data:
                return [
                    {
                        "id": str(t.id),
                        "text": t.text,
                        "likes":       (t.public_metrics or {}).get("like_count", 0),
                        "replies":     (t.public_metrics or {}).get("reply_count", 0),
                        "retweets":    (t.public_metrics or {}).get("retweet_count", 0),
                        "impressions": (t.public_metrics or {}).get("impression_count", 0),
                    }
                    for t in resp.data
                ]
        except Exception:
            pass  # fall through to get_users_tweets

    # Fallback: direct timeline endpoint without tweet_fields
    resp = client.get_users_tweets(
        id=user_id,
        exclude=["retweets", "replies"],
        max_results=50,
    )
    if not resp.data:
        return []

    return [
        {"id": str(t.id), "text": t.text,
         "likes": 0, "replies": 0, "retweets": 0, "impressions": 0}
        for t in resp.data
    ]


def get_cache_status(account: WatchedAccount) -> dict:
    """
    Return cache status for a single watched account.
    Used by the API to show the user what will happen before they run.
    """
    if account.fetched_at is None:
        return {
            "handle":      account.x_handle,
            "status":      "never_fetched",
            "label":       "Never fetched — will call X API",
            "days_ago":    None,
            "can_refetch": True,
        }

    days_ago = (datetime.utcnow() - account.fetched_at).days
    fetched_today = account.fetched_at.date() == date.today()

    if fetched_today:
        return {
            "handle":      account.x_handle,
            "status":      "fetched_today",
            "label":       "Fetched today — using saved data (cannot re-fetch)",
            "days_ago":    0,
            "can_refetch": False,
        }
    elif days_ago < 7:
        return {
            "handle":      account.x_handle,
            "status":      "cached",
            "label":       f"Last fetched {days_ago}d ago — using saved data (free)",
            "days_ago":    days_ago,
            "can_refetch": True,
        }
    else:
        return {
            "handle":      account.x_handle,
            "status":      "stale",
            "label":       f"Last fetched {days_ago}d ago — cache stale, will call X API",
            "days_ago":    days_ago,
            "can_refetch": True,
        }


def scrape_account(
    account: WatchedAccount,
    auto: bool = False,
    force: bool = False,
    bearer_token: str | None = None,
) -> dict:
    """
    Fetch or return cached tweets for one watched account.

    auto=True  → 7-day cache window (weekly cron path)
    """
    if settings.pause_external_apis:
        return {"handle": account.x_handle, "posts": account.cached_tweets or [], "used_cache": True, "paused": True}
    db = SessionLocal()
    try:
        # Re-query inside this session to get a live row
        acc = db.query(WatchedAccount).filter(WatchedAccount.id == account.id).first()
        if not acc:
            return {"handle": account.x_handle, "category": account.category, "posts": [], "used_cache": False}

        fetched_today = acc.fetched_at and acc.fetched_at.date() == date.today()
        within_7_days = acc.fetched_at and (datetime.utcnow() - acc.fetched_at).days < 7
        has_cache = bool(acc.cached_tweets)

        # Determine whether to use cache
        use_cache = False
        if fetched_today and has_cache:
            use_cache = True  # hard block — same day, always use cache
        elif auto and within_7_days and has_cache:
            use_cache = True  # auto run within window
        elif not force and within_7_days and has_cache:
            use_cache = True  # manual run but user didn't choose re-fetch

        if use_cache:
            log.info("niche_scraper: using cache for @%s (fetched_at=%s)", acc.x_handle, acc.fetched_at)
            return {
                "handle":     acc.x_handle,
                "category":   acc.category,
                "posts":      acc.cached_tweets or [],
                "used_cache": True,
                "fetched_at": acc.fetched_at.isoformat() if acc.fetched_at else None,
            }

        # Need to call API
        client = _get_client(bearer_token)

        # Resolve user ID (cached permanently)
        if not acc.x_user_id:
            log.info("niche_scraper: looking up user ID for @%s ($0.01)", acc.x_handle)
            try:
                user_id = _lookup_user_id(client, acc.x_handle)
                acc.x_user_id = user_id
                db.commit()
            except Exception as e:
                log.warning("niche_scraper: user ID lookup failed for @%s: %s", acc.x_handle, e)
                return {"handle": acc.x_handle, "category": acc.category, "posts": [], "used_cache": False, "error": str(e)}
        else:
            user_id = acc.x_user_id

        # Fetch timeline
        log.info("niche_scraper: fetching timeline for @%s (user_id=%s)", acc.x_handle, user_id)
        try:
            posts = _fetch_timeline(client, user_id)
        except tweepy.TooManyRequests:
            log.warning("niche_scraper: rate limited for @%s — returning cache if available", acc.x_handle)
            return {
                "handle":     acc.x_handle,
                "category":   acc.category,
                "posts":      acc.cached_tweets or [],
                "used_cache": True,
                "error":      "rate_limited",
                "fetched_at": acc.fetched_at.isoformat() if acc.fetched_at else None,
            }
        except Exception as e:
            log.warning("niche_scraper: timeline fetch failed for @%s: %s", acc.x_handle, e)
            return {"handle": acc.x_handle, "category": acc.category, "posts": acc.cached_tweets or [], "used_cache": bool(acc.cached_tweets), "error": str(e)}

        # Save cache
        now = datetime.utcnow()
        acc.cached_tweets = posts
        acc.fetched_at = now
        db.commit()

        return {
            "handle":     acc.x_handle,
            "category":   acc.category,
            "posts":      posts,
            "used_cache": False,
            "fetched_at": now.isoformat(),
        }
    finally:
        db.close()


def scrape_watched_accounts(
    accounts: list[WatchedAccount],
    auto: bool = False,
    force: bool = False,
    bearer_token: str | None = None,
) -> list[dict]:
    """Scrape all watched accounts with cost controls applied."""
    return [scrape_account(a, auto=auto, force=force, bearer_token=bearer_token) for a in accounts]
