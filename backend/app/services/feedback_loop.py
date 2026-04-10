"""
Feedback loop — closes the learning cycle.

After analytics are pulled from X, this service:
1. Scores every posted tweet using the same engagement formula as the example bank
2. Writes performance_score back to ContentDraft
3. Determines a per-project "high performer" threshold (top 25%)
4. Tags drafts: score >= threshold = validated, below = weak

The example bank reads these scores in the next generation cycle —
our own proven posts get promoted into the prompt alongside competitor examples.

Called at the end of analytics_puller.pull_analytics_for_project().
No external API calls. Pure DB reads + writes.
"""
import logging
from sqlalchemy.orm import Session

from app.models.content import ContentDraft, ContentStatus, PostAnalytics

log = logging.getLogger(__name__)

# Weights — same as example_bank so scores are comparable
_LIKE_W   = 1.0
_RT_W     = 2.5
_REPLY_W  = 1.5


def _score(likes: int, retweets: int, replies: int) -> float:
    return likes * _LIKE_W + retweets * _RT_W + replies * _REPLY_W


def score_project_posts(project_id: int, db: Session) -> dict:
    """
    Score all posted drafts for a project that have analytics data.
    Writes performance_score to ContentDraft.
    Returns summary: {scored, high_performers, threshold}
    """
    # Pull all posted drafts with analytics
    rows = (
        db.query(ContentDraft, PostAnalytics)
        .join(PostAnalytics, ContentDraft.tweet_id == PostAnalytics.tweet_id)
        .filter(
            ContentDraft.project_id == project_id,
            ContentDraft.status == ContentStatus.posted,
            ContentDraft.tweet_id.isnot(None),
        )
        .all()
    )

    if not rows:
        return {"scored": 0, "high_performers": 0, "threshold": 0}

    # Compute scores
    scored = []
    for draft, analytics in rows:
        s = _score(analytics.likes, analytics.retweets, analytics.replies)
        draft.performance_score = s
        scored.append((draft, s))

    # Determine threshold: top 25% of scores
    scores_only = sorted([s for _, s in scored], reverse=True)
    threshold_idx = max(0, len(scores_only) // 4 - 1)
    threshold = scores_only[threshold_idx] if scores_only else 0

    high_performers = sum(1 for _, s in scored if s >= threshold and threshold > 0)

    db.commit()

    log.info(
        "Feedback loop: scored %d posts for project %d — %d high performers (threshold=%.1f)",
        len(scored), project_id, high_performers, threshold,
    )

    return {
        "scored": len(scored),
        "high_performers": high_performers,
        "threshold": threshold,
    }
