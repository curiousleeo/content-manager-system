from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notifications import Notification
from app.services.usage_tracker import get_usage_stats

router = APIRouter()


@router.get("")
def list_notifications(db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = db.query(Notification).filter(Notification.read == False).count()
    return {
        "notifications": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "read": n.read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs
        ],
        "unread_count": unread_count,
        "usage": get_usage_stats(db),
    }


@router.post("/mark-read")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.read == False).update({"read": True})
    db.commit()
    return {"ok": True}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.id == notification_id).delete()
    db.commit()
    return {"ok": True}
