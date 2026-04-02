import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import ContentDraft, ContentStatus, Platform
from app.services.x_poster import post_tweet
from app.scheduler import scheduler

router = APIRouter()


class ScheduleRequest(BaseModel):
    text: str
    platform: str = "x"
    scheduled_at: datetime


def _post_job(draft_id: int):
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        draft = db.query(ContentDraft).filter(ContentDraft.id == draft_id).first()
        if not draft:
            return
        if draft.platform == Platform.x:
            post_tweet(draft.body)
        draft.status = ContentStatus.posted
        draft.posted_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.query(ContentDraft).filter(ContentDraft.id == draft_id).update(
            {"status": ContentStatus.failed}
        )
        db.commit()
    finally:
        db.close()


@router.post("/schedule")
def schedule_post(req: ScheduleRequest, db: Session = Depends(get_db)):
    draft = ContentDraft(
        topic="scheduled",
        platform=Platform(req.platform),
        body=req.text,
        status=ContentStatus.scheduled,
        scheduled_at=req.scheduled_at,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    scheduler.add_job(
        _post_job,
        "date",
        run_date=req.scheduled_at,
        args=[draft.id],
        id=str(draft.id),
    )

    return {
        "id": str(draft.id),
        "text": draft.body,
        "platform": draft.platform,
        "scheduled_at": draft.scheduled_at.isoformat(),
        "status": draft.status,
    }


@router.get("/list")
def list_scheduled(project_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(ContentDraft).filter(
        ContentDraft.status.in_([ContentStatus.scheduled, ContentStatus.posted, ContentStatus.failed])
    )
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)
    drafts = query.order_by(ContentDraft.scheduled_at.desc()).limit(50).all()
    return {
        "posts": [
            {
                "id": str(d.id),
                "text": d.body,
                "platform": d.platform,
                "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
                "posted_at": d.posted_at.isoformat() if d.posted_at else None,
                "status": d.status,
            }
            for d in drafts
        ]
    }


@router.delete("/{job_id}")
def cancel_scheduled(job_id: str, db: Session = Depends(get_db)):
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass
    db.query(ContentDraft).filter(ContentDraft.id == int(job_id)).update(
        {"status": ContentStatus.failed}
    )
    db.commit()
    return {"status": "cancelled"}
