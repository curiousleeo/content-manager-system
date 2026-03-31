from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.content import Project
from app.services.claude_service import review_content

router = APIRouter()


class ReviewRequest(BaseModel):
    text: str
    platform: str = "x"
    project_id: Optional[int] = None


@router.post("/check")
def review(req: ReviewRequest, db: Session = Depends(get_db)):
    project = None
    if req.project_id:
        p = db.query(Project).filter(Project.id == req.project_id).first()
        if p:
            project = {"tone": p.tone, "style": p.style, "avoid": p.avoid, "target_audience": p.target_audience}
    result = review_content(req.text, req.platform, project=project)
    return {"review": result}
