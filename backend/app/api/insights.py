from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.content import Project, ResearchTopic
from app.services.claude_service import analyze_insights
from app.services.usage_tracker import record_usage

router = APIRouter()


@router.get("/latest")
def latest_insights(project_id: int | None = None, db: Session = Depends(get_db)):
    """Return the most recent ResearchTopic that has insights (for standalone fallback)."""
    query = db.query(ResearchTopic).filter(ResearchTopic.insights.isnot(None))
    if project_id is not None:
        query = query.filter(ResearchTopic.project_id == project_id)
    topic = query.order_by(ResearchTopic.created_at.desc()).first()
    if not topic:
        return {"insights": None, "research_id": None}
    return {
        "insights": topic.insights,
        "research_id": topic.id,
        "query": topic.query,
        "created_at": topic.created_at.isoformat(),
    }


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
