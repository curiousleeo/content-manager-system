from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.content import PostAnalytics, ContentDraft

router = APIRouter()


@router.get("/posts")
def get_post_analytics(
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Return analytics joined to their drafts.
    Optionally scoped to a project.
    """
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
    """
    Return top N posts by impressions this calendar month.
    """
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
                "posted_at":   d.posted_at.isoformat() if d and d.posted_at else None,
                "impressions": a.impressions,
                "likes":       a.likes,
                "replies":     a.replies,
                "retweets":    a.retweets,
            }
            for a, d in rows
        ]
    }
