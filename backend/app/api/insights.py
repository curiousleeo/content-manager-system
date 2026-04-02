from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.content import Project, ResearchTopic
from app.services.claude_service import analyze_insights
from app.services.usage_tracker import record_usage

router = APIRouter()


class InsightRequest(BaseModel):
    research_data: dict
    project_id: Optional[int] = None
    research_id: Optional[int] = None  # ID of the ResearchTopic row to update


@router.post("/analyze")
def analyze(req: InsightRequest, db: Session = Depends(get_db)):
    project = None
    if req.project_id:
        p = db.query(Project).filter(Project.id == req.project_id).first()
        if p:
            project = {"tone": p.tone, "style": p.style, "avoid": p.avoid, "target_audience": p.target_audience}

    insights = analyze_insights(req.research_data, project=project)
    record_usage(db, "claude_calls", project_id=req.project_id)

    # Write insights back to the research_topics row if we have an ID
    if req.research_id:
        topic = db.query(ResearchTopic).filter(ResearchTopic.id == req.research_id).first()
        if topic:
            topic.insights = insights
            db.commit()

    return {"insights": insights}
