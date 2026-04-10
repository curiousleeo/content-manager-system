"""
Example bank — builds a rich, ranked set of real tweet examples from cached competitor data.

No API calls. Reads only from:
  - WatchedAccount.cached_tweets (raw tweets + engagement)
  - NicheReport.swipe_file (Claude-curated best examples, if an injected report exists)

Used by the generation prompt to give Claude actual style examples instead of category labels.
"""
from sqlalchemy.orm import Session
from app.models.content import WatchedAccount, NicheReport, ContentDraft, ContentStatus, PostAnalytics


def _engagement_score(tweet: dict) -> float:
    """Weighted engagement score. Retweets signal stronger resonance than likes."""
    return (
        tweet.get("likes", 0)
        + tweet.get("retweets", 0) * 2.5
        + tweet.get("replies", 0) * 1.5
    )


def _get_own_top_posts(project_id: int, db: Session, limit: int = 5) -> list[dict]:
    """
    Return our own top-performing posts by performance_score.
    Only includes posts that have been scored by the feedback loop.
    """
    rows = (
        db.query(ContentDraft, PostAnalytics)
        .join(PostAnalytics, ContentDraft.tweet_id == PostAnalytics.tweet_id)
        .filter(
            ContentDraft.project_id == project_id,
            ContentDraft.status == ContentStatus.posted,
            ContentDraft.performance_score.isnot(None),
            ContentDraft.body.isnot(None),
        )
        .all()
    )

    scored = []
    for draft, analytics in rows:
        score = float(draft.performance_score) if draft.performance_score is not None else 0
        if score > 0:
            scored.append({
                "text":     draft.body,
                "topic":    draft.topic or "",
                "likes":    analytics.likes,
                "retweets": analytics.retweets,
                "score":    score,
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def build_example_bank(project_id: int, db: Session) -> dict:
    """
    Returns a structured example bank ready for prompt injection:
    {
      "swipe_file":     list of Claude-curated examples [{handle, text, hook_type, why, likes}]
      "top_tweets":     list of raw top competitor tweets by engagement
      "own_top_posts":  list of our own posts that proved to work [{text, topic, likes, score}]
      "dominant_tone":  str
      "hook_patterns":  list of {type, example} — only patterns that have real examples attached
      "has_data":       bool — False means no competitor or own data exists yet
    }
    """
    # ── Pull all cached tweets from watched accounts ───────────────────────────
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .all()
    )

    all_tweets = []
    for acc in accounts:
        for tweet in (acc.cached_tweets or []):
            all_tweets.append({
                "handle":   acc.x_handle,
                "category": acc.category,
                "text":     tweet.get("text", ""),
                "likes":    tweet.get("likes", 0),
                "retweets": tweet.get("retweets", 0),
                "replies":  tweet.get("replies", 0),
                "score":    _engagement_score(tweet),
            })

    # Sort and take top 20 across all accounts
    all_tweets.sort(key=lambda t: t["score"], reverse=True)
    top_tweets = [t for t in all_tweets if t["text"].strip()][:20]

    # ── Pull injected niche report (Claude-curated layer) ─────────────────────
    niche_report = (
        db.query(NicheReport)
        .filter(
            NicheReport.project_id == project_id,
            NicheReport.status == "injected",
        )
        .order_by(NicheReport.report_date.desc())
        .first()
    )

    swipe_file = []
    dominant_tone = ""
    hook_patterns = []

    if niche_report:
        dominant_tone = (niche_report.patterns or {}).get("dominant_tone", "")

        # Enrich swipe file entries with engagement from raw cache
        raw_swipe = niche_report.swipe_file or []
        tweet_lookup = {t["text"][:80]: t for t in all_tweets}
        for entry in raw_swipe:
            text_key = entry.get("text", "")[:80]
            raw = tweet_lookup.get(text_key, {})
            swipe_file.append({
                "handle":    entry.get("handle", ""),
                "text":      entry.get("text", ""),
                "hook_type": entry.get("hook_type", ""),
                "why":       entry.get("why", ""),
                "likes":     raw.get("likes", 0),
                "retweets":  raw.get("retweets", 0),
            })

        # Only keep hook patterns that have a real example attached
        for hp in (niche_report.patterns or {}).get("hook_patterns", []):
            if hp.get("example") and hp.get("type"):
                hook_patterns.append({
                    "type":          hp["type"],
                    "example":       hp["example"],
                    "effectiveness": hp.get("effectiveness", ""),
                })

    own_top_posts = _get_own_top_posts(project_id, db)

    return {
        "swipe_file":    swipe_file,
        "top_tweets":    top_tweets,
        "own_top_posts": own_top_posts,
        "dominant_tone": dominant_tone,
        "hook_patterns": hook_patterns,
        "has_data":      bool(top_tweets or swipe_file or own_top_posts),
    }
