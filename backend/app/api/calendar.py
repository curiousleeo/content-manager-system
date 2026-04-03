from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import ContentDraft, ContentStatus
from app.scheduler import scheduler

router = APIRouter()


def _serialize(d: ContentDraft) -> dict:
    return {
        "id": d.id,
        "status": d.status,
        "text": d.body,
        "topic": d.topic,
        "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
        "posted_at": d.posted_at.isoformat() if d.posted_at else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@router.get("/posts")
def calendar_posts(
    project_id: int | None = Query(None),
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
):
    """Return all posts relevant to the given month for the calendar view."""
    # Build month window
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1)
    else:
        month_end = datetime(year, month + 1, 1)

    base = db.query(ContentDraft)
    if project_id is not None:
        base = base.filter(ContentDraft.project_id == project_id)

    # Scheduled / failed / draft — placed by scheduled_at
    by_scheduled = (
        base.filter(
            ContentDraft.scheduled_at >= month_start,
            ContentDraft.scheduled_at < month_end,
        )
        .all()
    )

    # Posted — placed by posted_at (if not already captured above)
    by_posted = (
        base.filter(
            ContentDraft.status == ContentStatus.posted,
            ContentDraft.posted_at >= month_start,
            ContentDraft.posted_at < month_end,
            ContentDraft.scheduled_at == None,  # noqa: E711
        )
        .all()
    )

    seen = set()
    results = []
    for d in by_scheduled + by_posted:
        if d.id not in seen:
            seen.add(d.id)
            results.append(_serialize(d))

    return {"posts": results}


class RescheduleRequest(BaseModel):
    scheduled_at: datetime


@router.patch("/{draft_id}/reschedule")
def reschedule_post(draft_id: int, req: RescheduleRequest, db: Session = Depends(get_db)):
    """Update scheduled_at for drag-and-drop rescheduling."""
    draft = db.query(ContentDraft).filter(ContentDraft.id == draft_id).first()
    if not draft:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.scheduled_at = req.scheduled_at

    # If scheduled, replace the APScheduler job
    if draft.status == ContentStatus.scheduled:
        try:
            scheduler.remove_job(str(draft_id))
        except Exception:
            pass
        from app.api.scheduler import _post_job
        scheduler.add_job(
            _post_job,
            "date",
            run_date=req.scheduled_at,
            args=[draft_id],
            id=str(draft_id),
        )

    db.commit()
    return _serialize(draft)
