from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.content import ContentDraft, ContentStatus, Platform, Project, BrandBrain
from app.services.claude_service import generate_content, batch_generate_content
from app.services.example_bank import build_example_bank
from app.services.x_poster import post_tweet
from app.services.platform_compliance import hard_block_check
from app.services.usage_tracker import record_usage

router = APIRouter()


def _get_project(project_id: int | None, db: Session) -> dict | None:
    if not project_id:
        return None
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        return None
    return {
        "tone": p.tone, "style": p.style, "avoid": p.avoid, "target_audience": p.target_audience,
        "x_api_key": p.x_api_key, "x_api_secret": p.x_api_secret,
        "x_access_token": p.x_access_token, "x_access_token_secret": p.x_access_token_secret,
        "x_bearer_token": p.x_bearer_token,
    }


def _get_brand_brain(project_id: int | None, db: Session) -> dict | None:
    if not project_id:
        return None
    brain = db.query(BrandBrain).filter(BrandBrain.project_id == project_id).first()
    if not brain:
        return None
    return {
        "mission": brain.mission,
        "core_beliefs": brain.core_beliefs or [],
        "hard_nos": brain.hard_nos or [],
        "topic_angles": brain.topic_angles or {},
        "voice_examples": brain.voice_examples or [],
        "competitor_gap": brain.competitor_gap,
    }


def _get_example_bank(project_id: int | None, db: Session) -> dict | None:
    """Build rich example bank from cached competitor tweets + injected niche report."""
    if not project_id:
        return None
    bank = build_example_bank(project_id, db)
    return bank if bank["has_data"] else None


def _serialize_draft(d: ContentDraft) -> dict:
    return {
        "id": d.id,
        "topic": d.topic,
        "platform": d.platform,
        "text": d.body,
        "status": d.status,
        "auto_queue": bool(d.auto_queue),
        "tweet_id": d.tweet_id,
        "scheduled_at": d.scheduled_at.isoformat() if d.scheduled_at else None,
        "posted_at": d.posted_at.isoformat() if d.posted_at else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


class GenerateRequest(BaseModel):
    topic: str
    insights: dict
    platform: str = "x"
    project_id: Optional[int] = None


class BatchGenerateRequest(BaseModel):
    insights: dict = {}
    platform: str = "x"
    project_id: Optional[int] = None
    count: int = 15
    pillars: Optional[list[str]] = None  # override project pillars if provided


class SaveDraftRequest(BaseModel):
    text: str
    topic: str = "manual"
    platform: str = "x"
    project_id: Optional[int] = None
    auto_queue: bool = False


class PostRequest(BaseModel):
    text: str
    platform: str = "x"
    project_id: Optional[int] = None


class AutoQueueRequest(BaseModel):
    enabled: bool


# ── Single generate ───────────────────────────────────────────────────────────

@router.post("/generate")
def generate(req: GenerateRequest, db: Session = Depends(get_db)):
    project = _get_project(req.project_id, db)
    example_bank = _get_example_bank(req.project_id, db)
    brand_brain = _get_brand_brain(req.project_id, db)
    text = generate_content(req.topic, req.insights, req.platform, project=project, example_bank=example_bank, brand_brain=brand_brain)
    record_usage(db, "claude_calls", project_id=req.project_id)
    return {"platform": req.platform, "text": text}


# ── Batch generate ────────────────────────────────────────────────────────────

@router.post("/batch-generate")
def batch_generate(req: BatchGenerateRequest, db: Session = Depends(get_db)):
    """Generate req.count posts across all project pillars in one Claude call. Saves all as drafts."""
    project_row = db.query(Project).filter(Project.id == req.project_id).first() if req.project_id else None
    pillars = req.pillars or (project_row.content_pillars if project_row else []) or []
    if not pillars:
        raise HTTPException(status_code=400, detail="No content pillars configured for this project")

    project = _get_project(req.project_id, db)
    example_bank = _get_example_bank(req.project_id, db)
    brand_brain = _get_brand_brain(req.project_id, db)

    posts = batch_generate_content(
        pillars=pillars,
        insights=req.insights,
        platform=req.platform,
        project=project,
        example_bank=example_bank,
        brand_brain=brand_brain,
        count=req.count,
    )
    record_usage(db, "claude_calls", project_id=req.project_id)

    drafts = []
    for post in posts:
        d = ContentDraft(
            project_id=req.project_id,
            topic=post.get("pillar", "batch"),
            platform=Platform(req.platform),
            body=post.get("text", ""),
            status=ContentStatus.draft,
        )
        db.add(d)
        db.flush()  # get id before commit
        drafts.append(d)

    db.commit()
    return {"drafts": [_serialize_draft(d) for d in drafts]}


# ── Save single draft ─────────────────────────────────────────────────────────

@router.post("/save-draft")
def save_draft(req: SaveDraftRequest, db: Session = Depends(get_db)):
    """Save a single post text as a draft (optionally auto-queued)."""
    d = ContentDraft(
        project_id=req.project_id,
        topic=req.topic,
        platform=Platform(req.platform),
        body=req.text,
        status=ContentStatus.draft,
        auto_queue=req.auto_queue,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _serialize_draft(d)


# ── Draft list (for picker UI) ────────────────────────────────────────────────

@router.get("/drafts")
def list_drafts(project_id: int | None = None, db: Session = Depends(get_db)):
    """Return all status=draft records for a project. Used by review/schedule pickers."""
    query = db.query(ContentDraft).filter(ContentDraft.status == ContentStatus.draft)
    if project_id is not None:
        query = query.filter(ContentDraft.project_id == project_id)
    drafts = query.order_by(ContentDraft.created_at.desc()).limit(50).all()
    return {"drafts": [_serialize_draft(d) for d in drafts]}


# ── Auto-queue toggle ─────────────────────────────────────────────────────────

@router.patch("/{draft_id}/auto-queue")
def set_auto_queue(draft_id: int, req: AutoQueueRequest, db: Session = Depends(get_db)):
    draft = db.query(ContentDraft).filter(ContentDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    draft.auto_queue = req.enabled
    db.commit()
    return {"id": draft_id, "auto_queue": req.enabled}


# ── Delete draft ──────────────────────────────────────────────────────────────

@router.delete("/{draft_id}")
def delete_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(ContentDraft).filter(ContentDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    db.delete(draft)
    db.commit()
    return {"status": "deleted"}


@router.delete("/bulk")
def bulk_delete_drafts(ids: list[int], db: Session = Depends(get_db)):
    db.query(ContentDraft).filter(ContentDraft.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"status": "deleted", "count": len(ids)}


# ── Post now ──────────────────────────────────────────────────────────────────

@router.post("/post-now")
def post_now(req: PostRequest, db: Session = Depends(get_db)):
    block = hard_block_check(req.text)
    if block:
        raise HTTPException(status_code=422, detail=block["message"])

    if req.platform == "x":
        project = _get_project(req.project_id, db)
        result = post_tweet(req.text, project=project)
        tweet_id = result.get("tweet_id")

        draft = ContentDraft(
            project_id=req.project_id,
            topic="posted",
            platform=Platform.x,
            body=req.text,
            status=ContentStatus.posted,
            tweet_id=tweet_id,
            posted_at=datetime.utcnow(),
        )
        db.add(draft)
        record_usage(db, "x_posts", project_id=req.project_id)
        db.commit()
        return {"status": "posted", "result": result}

    return {"status": "error", "message": f"Platform {req.platform} not supported yet"}
