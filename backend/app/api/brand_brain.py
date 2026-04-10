from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import BrandBrain

router = APIRouter()


class BrandBrainPayload(BaseModel):
    mission: Optional[str] = None
    core_beliefs: Optional[list[str]] = None
    hard_nos: Optional[list[str]] = None
    topic_angles: Optional[dict[str, str]] = None
    voice_examples: Optional[list[str]] = None
    competitor_gap: Optional[str] = None


def _serialize(b: BrandBrain) -> dict:
    return {
        "id": b.id,
        "project_id": b.project_id,
        "mission": b.mission,
        "core_beliefs": b.core_beliefs or [],
        "hard_nos": b.hard_nos or [],
        "topic_angles": b.topic_angles or {},
        "voice_examples": b.voice_examples or [],
        "competitor_gap": b.competitor_gap,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


@router.get("/{project_id}")
def get_brand_brain(project_id: int, db: Session = Depends(get_db)):
    brain = db.query(BrandBrain).filter(BrandBrain.project_id == project_id).first()
    if not brain:
        # Return empty shell so frontend always gets a consistent shape
        return {
            "project_id": project_id,
            "mission": None,
            "core_beliefs": [],
            "hard_nos": [],
            "topic_angles": {},
            "voice_examples": [],
            "competitor_gap": None,
            "updated_at": None,
        }
    return _serialize(brain)


@router.put("/{project_id}")
def upsert_brand_brain(project_id: int, payload: BrandBrainPayload, db: Session = Depends(get_db)):
    brain = db.query(BrandBrain).filter(BrandBrain.project_id == project_id).first()
    if not brain:
        brain = BrandBrain(project_id=project_id)
        db.add(brain)

    if payload.mission is not None:
        brain.mission = payload.mission.strip() or None
    if payload.core_beliefs is not None:
        brain.core_beliefs = [b.strip() for b in payload.core_beliefs if b.strip()]
    if payload.hard_nos is not None:
        brain.hard_nos = [h.strip() for h in payload.hard_nos if h.strip()]
    if payload.topic_angles is not None:
        brain.topic_angles = {k.strip(): v.strip() for k, v in payload.topic_angles.items() if k.strip() and v.strip()}
    if payload.voice_examples is not None:
        brain.voice_examples = [e.strip() for e in payload.voice_examples if e.strip()]
    if payload.competitor_gap is not None:
        brain.competitor_gap = payload.competitor_gap.strip() or None

    db.commit()
    db.refresh(brain)
    return _serialize(brain)
