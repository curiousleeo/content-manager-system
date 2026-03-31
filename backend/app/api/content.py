from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import ContentDraft, ContentStatus, Platform, Project
from app.services.claude_service import generate_content
from app.services.x_poster import post_tweet

router = APIRouter()


def _get_project(project_id: int | None, db: Session) -> dict | None:
    if not project_id:
        return None
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        return None
    return {"tone": p.tone, "style": p.style, "avoid": p.avoid, "target_audience": p.target_audience}


class GenerateRequest(BaseModel):
    topic: str
    insights: dict
    platform: str = "x"
    project_id: Optional[int] = None


class PostRequest(BaseModel):
    text: str
    platform: str = "x"
    project_id: Optional[int] = None


class ReviewRequest(BaseModel):
    text: str
    platform: str = "x"
    project_id: Optional[int] = None


@router.post("/generate")
def generate(req: GenerateRequest, db: Session = Depends(get_db)):
    project = _get_project(req.project_id, db)
    text = generate_content(req.topic, req.insights, req.platform, project=project)
    return {"platform": req.platform, "text": text}


@router.post("/post-now")
def post_now(req: PostRequest, db: Session = Depends(get_db)):
    if req.platform == "x":
        result = post_tweet(req.text)
        draft = ContentDraft(
            project_id=req.project_id,
            topic="posted",
            platform=Platform.x,
            body=req.text,
            status=ContentStatus.posted,
        )
        db.add(draft)
        db.commit()
        return {"status": "posted", "result": result}
    return {"status": "error", "message": f"Platform {req.platform} not supported yet"}
