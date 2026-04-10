"""
Analytics puller — runs daily at 06:00 UTC.
Reads all posts from the last 7 days that have a tweet_id,
calls X API v2 /tweets/:id with public_metrics, stores results.

Uses per-project bearer token if set, falls back to global.
"""
import logging
from datetime import datetime, timedelta

import tweepy

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.content import ContentDraft, ContentStatus, PostAnalytics, Project
from app.models.notifications import Notification
from app.services.feedback_loop import score_project_posts

log = logging.getLogger(__name__)


def _get_bearer(project: Project | None) -> str | None:
    if project and project.x_bearer_token:
        return project.x_bearer_token
    return settings.x_bearer_token or None


def pull_analytics_for_project(project_id: int) -> None:
    """Pull public_metrics for all posts from this project in the last 7 days."""
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        bearer = _get_bearer(project)
        if not bearer:
            log.info("No bearer token for project %d — skipping analytics pull", project_id)
            return

        cutoff = datetime.utcnow() - timedelta(days=7)
        drafts = (
            db.query(ContentDraft)
            .filter(
                ContentDraft.project_id == project_id,
                ContentDraft.status == ContentStatus.posted,
                ContentDraft.tweet_id.isnot(None),
                ContentDraft.posted_at >= cutoff,
            )
            .all()
        )

        if not drafts:
            log.info("No recent posts to pull analytics for project %d", project_id)
            return

        client = tweepy.Client(bearer_token=bearer, wait_on_rate_limit=False)
        tweet_ids = [d.tweet_id for d in drafts]
        draft_map = {d.tweet_id: d for d in drafts}

        # X API allows up to 100 IDs per request
        for chunk_start in range(0, len(tweet_ids), 100):
            chunk = tweet_ids[chunk_start:chunk_start + 100]
            try:
                response = client.get_tweets(
                    ids=chunk,
                    tweet_fields=["public_metrics"],
                )
            except tweepy.TooManyRequests:
                log.warning("Rate limited pulling analytics for project %d — will retry tomorrow", project_id)
                break
            except Exception as e:
                log.warning("X API error for project %d: %s", project_id, e)
                break

            if not response.data:
                continue

            for tweet in response.data:
                metrics = tweet.public_metrics or {}
                tid = str(tweet.id)
                draft = draft_map.get(tid)

                existing = db.query(PostAnalytics).filter(PostAnalytics.tweet_id == tid).first()
                if existing:
                    existing.impressions = metrics.get("impression_count", existing.impressions)
                    existing.likes       = metrics.get("like_count", existing.likes)
                    existing.replies     = metrics.get("reply_count", existing.replies)
                    existing.retweets    = metrics.get("retweet_count", existing.retweets)
                    existing.pulled_at   = datetime.utcnow()
                else:
                    db.add(PostAnalytics(
                        draft_id    = draft.id if draft else None,
                        tweet_id    = tid,
                        impressions = metrics.get("impression_count", 0),
                        likes       = metrics.get("like_count", 0),
                        replies     = metrics.get("reply_count", 0),
                        retweets    = metrics.get("retweet_count", 0),
                        pulled_at   = datetime.utcnow(),
                    ))

        db.commit()
        log.info("Analytics pulled for project %d — %d tweets", project_id, len(drafts))

        # Feedback loop — score all posts now that analytics are fresh
        score_project_posts(project_id, db)

    except Exception as e:
        log.exception("Analytics pull failed for project %d", project_id)
        try:
            db.add(Notification(
                type="error",
                title=f"Analytics pull failed — project #{project_id}",
                message=str(e)[:300],
            ))
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


def pull_all_projects() -> None:
    """Pull analytics for every project. Called by the daily cron."""
    db = SessionLocal()
    try:
        projects = db.query(Project).all()
    finally:
        db.close()

    for p in projects:
        pull_analytics_for_project(p.id)
