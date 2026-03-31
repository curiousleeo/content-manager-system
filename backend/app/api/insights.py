from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.content import Project
from app.services.claude_service import analyze_insights

router = APIRouter()


class InsightRequest(BaseModel):
    research_data: dict
    project_id: Optional[int] = None


@router.post("/analyze")
def analyze(req: InsightRequest, db: Session = Depends(get_db)):
    project = None
    if req.project_id:
        p = db.query(Project).filter(Project.id == req.project_id).first()
        if p:
            project = {"tone": p.tone, "style": p.style, "avoid": p.avoid, "target_audience": p.target_audience}
    insights = analyze_insights(req.research_data, project=project)
    return {"insights": insights}
