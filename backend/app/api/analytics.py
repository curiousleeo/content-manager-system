from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.content import PostAnalytics, ContentDraft, ContentStatus, WatchedAccount

router = APIRouter()

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@router.get("/posts")
def get_post_analytics(
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return analytics joined to their drafts."""
    query = (
        db.query(PostAnalytics, ContentDraft)
        .outerjoin(ContentDraft, PostAnalytics.draft_id == ContentDraft.id)
    )
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)

    rows = query.order_by(desc(PostAnalytics.pulled_at)).limit(100).all()

    return {
        "analytics": [
            {
                "tweet_id":    a.tweet_id,
                "draft_id":    a.draft_id,
                "text":        d.body if d else None,
                "posted_at":   d.posted_at.isoformat() if d and d.posted_at else None,
                "impressions": a.impressions,
                "likes":       a.likes,
                "replies":     a.replies,
                "retweets":    a.retweets,
                "pulled_at":   a.pulled_at.isoformat(),
            }
            for a, d in rows
        ]
    }


@router.get("/top")
def get_top_posts(
    project_id: int | None = Query(None),
    limit: int = 5,
    db: Session = Depends(get_db),
):
    """Return top N posts by impressions this calendar month, including pillar."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    query = (
        db.query(PostAnalytics, ContentDraft)
        .outerjoin(ContentDraft, PostAnalytics.draft_id == ContentDraft.id)
        .filter(PostAnalytics.pulled_at >= month_start)
    )
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)

    rows = (
        query
        .order_by(desc(PostAnalytics.impressions))
        .limit(limit)
        .all()
    )

    return {
        "top_posts": [
            {
                "tweet_id":    a.tweet_id,
                "text":        d.body if d else None,
                "topic":       d.topic if d else None,
                "posted_at":   d.posted_at.isoformat() if d and d.posted_at else None,
                "impressions": a.impressions,
                "likes":       a.likes,
                "replies":     a.replies,
                "retweets":    a.retweets,
            }
            for a, d in rows
        ]
    }


@router.get("/timeline")
def get_timeline(
    project_id: int | None = Query(None),
    days: int = Query(30),
    db: Session = Depends(get_db),
):
    """Return daily aggregated metrics for the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = (
        db.query(PostAnalytics, ContentDraft)
        .outerjoin(ContentDraft, PostAnalytics.draft_id == ContentDraft.id)
        .filter(PostAnalytics.pulled_at >= cutoff)
    )
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)

    rows = query.all()

    # Aggregate by date
    by_date: dict = defaultdict(lambda: {"impressions": 0, "likes": 0, "replies": 0, "retweets": 0, "count": 0})
    for a, _ in rows:
        date_key = a.pulled_at.strftime("%Y-%m-%d")
        by_date[date_key]["impressions"] += a.impressions
        by_date[date_key]["likes"] += a.likes
        by_date[date_key]["replies"] += a.replies
        by_date[date_key]["retweets"] += a.retweets
        by_date[date_key]["count"] += 1

    # Fill all days in range (even zeros)
    result = []
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        entry = by_date.get(d, {"impressions": 0, "likes": 0, "replies": 0, "retweets": 0, "count": 0})
        result.append({"date": d, **entry})

    return {"timeline": result}


@router.get("/frequency")
def get_posting_frequency(
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return post count grouped by day of week (Mon–Sun)."""
    query = db.query(ContentDraft).filter(
        ContentDraft.status == ContentStatus.posted,
        ContentDraft.posted_at != None,  # noqa: E711
    )
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)

    drafts = query.all()

    counts = defaultdict(int)
    for d in drafts:
        dow = d.posted_at.weekday()  # 0=Mon, 6=Sun
        counts[dow] += 1

    return {
        "frequency": [
            {"day": DAY_NAMES[i], "count": counts[i]}
            for i in range(7)
        ]
    }


@router.get("/pillars")
def get_pillar_performance(
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return average impressions per content pillar (topic)."""
    query = (
        db.query(PostAnalytics, ContentDraft)
        .outerjoin(ContentDraft, PostAnalytics.draft_id == ContentDraft.id)
        .filter(ContentDraft.topic != None)  # noqa: E711
    )
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)

    rows = query.all()

    pillar_data: dict = defaultdict(lambda: {"total_impressions": 0, "count": 0})
    for a, d in rows:
        if d and d.topic:
            pillar_data[d.topic]["total_impressions"] += a.impressions
            pillar_data[d.topic]["count"] += 1

    result = [
        {
            "pillar": pillar,
            "avg_impressions": round(v["total_impressions"] / v["count"]) if v["count"] else 0,
            "post_count": v["count"],
        }
        for pillar, v in pillar_data.items()
    ]
    result.sort(key=lambda x: x["avg_impressions"], reverse=True)

    return {"pillars": result}


@router.get("/benchmark")
def get_competitor_benchmark(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """
    Compare your avg engagement vs watched accounts.
    Competitor data derived from WatchedAccount.cached_tweets (if engagement data present).
    """
    # Your own averages from PostAnalytics
    your_rows = (
        db.query(PostAnalytics, ContentDraft)
        .outerjoin(ContentDraft, PostAnalytics.draft_id == ContentDraft.id)
        .filter(ContentDraft.project_id == project_id)
        .all()
    )
    your_likes = round(sum(a.likes for a, _ in your_rows) / len(your_rows)) if your_rows else 0
    your_impressions = round(sum(a.impressions for a, _ in your_rows) / len(your_rows)) if your_rows else 0

    # Competitor averages from cached_tweets
    accounts = db.query(WatchedAccount).filter(WatchedAccount.project_id == project_id).all()

    competitors = []
    latest_fetch: datetime | None = None

    for acct in accounts:
        tweets = acct.cached_tweets or []
        if not tweets:
            competitors.append({
                "handle": acct.x_handle,
                "avg_likes": None,
                "avg_impressions": None,
                "post_count": 0,
            })
            continue

        # X API v2 public_metrics shape: {"like_count": N, "impression_count": N, ...}
        likes_list = []
        impressions_list = []
        for t in tweets:
            pm = t.get("public_metrics") or {}
            if pm.get("like_count") is not None:
                likes_list.append(pm["like_count"])
            if pm.get("impression_count") is not None:
                impressions_list.append(pm["impression_count"])

        competitors.append({
            "handle": acct.x_handle,
            "avg_likes": round(sum(likes_list) / len(likes_list)) if likes_list else None,
            "avg_impressions": round(sum(impressions_list) / len(impressions_list)) if impressions_list else None,
            "post_count": len(tweets),
        })

        if acct.fetched_at and (latest_fetch is None or acct.fetched_at > latest_fetch):
            latest_fetch = acct.fetched_at

    return {
        "your_avg": {
            "handle": "You",
            "avg_likes": your_likes,
            "avg_impressions": your_impressions,
            "post_count": len(your_rows),
        },
        "competitors": competitors,
        "report_date": latest_fetch.strftime("%Y-%m-%d") if latest_fetch else None,
    }
