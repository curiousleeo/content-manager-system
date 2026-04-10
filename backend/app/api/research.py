from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.scrapers import google_scraper
from app.scrapers.coingecko_scraper import get_trending_coins
from app.scrapers.telegram_scraper import scrape_channels
from app.services.topic_discovery import discover_topics
from app.core.database import get_db
from app.models.content import ResearchTopic, Project

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str
    # Default is now competitor_topics — reads from cached tweets, no API cost.
    # google_trends is available but no longer the default.
    sources: list[str] = ["competitor_topics"]
    project_id: Optional[int] = None


class PasteRequest(BaseModel):
    text: str
    query: str = "manual"
    project_id: Optional[int] = None


@router.post("/run")
def run_research(req: ResearchRequest, db: Session = Depends(get_db)):
    results = {}
    sources_used = []

    # Competitor topics — primary source. Reads cached tweets already in DB.
    # No X API calls. Uses Claude Haiku to extract what's getting traction.
    if "competitor_topics" in req.sources and req.project_id:
        discovery = discover_topics(req.project_id, db)
        if discovery["has_data"]:
            results["competitor_topics"] = discovery
            sources_used.append("competitor_topics")

    # Google Trends — supplementary only. Useful for search intent context.
    # Not the primary source — keyword lists don't produce usable content angles.
    if "google_trends" in req.sources:
        results["google_trends"] = google_scraper.google_trends_related(req.query)
        sources_used.append("google_trends")

    # CoinGecko — only if enabled on project
    if "coingecko" in req.sources:
        project = db.query(Project).filter(Project.id == req.project_id).first() if req.project_id else None
        if project and project.coingecko_enabled:
            results["coingecko"] = get_trending_coins()
            sources_used.append("coingecko")

    # Telegram — only if project has channels configured
    project = db.query(Project).filter(Project.id == req.project_id).first() if req.project_id else None
    channels = (project.telegram_channels or []) if project else []
    if channels:
        results["telegram"] = scrape_channels(channels)
        sources_used.append("telegram")

    topic = ResearchTopic(
        project_id=req.project_id,
        query=req.query,
        sources=sources_used,
        source="google_trends" if sources_used else None,
        insights=None,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return {"query": req.query, "data": results, "research_id": topic.id}


@router.get("/latest")
def latest_research(project_id: int | None = None, db: Session = Depends(get_db)):
    """Return the most recent ResearchTopic for a project (for standalone fallback)."""
    query = db.query(ResearchTopic)
    if project_id is not None:
        query = query.filter(ResearchTopic.project_id == project_id)
    topic = query.order_by(ResearchTopic.created_at.desc()).first()
    if not topic:
        return {"research": None}
    return {
        "research": {
            "research_id": topic.id,
            "query": topic.query,
            "data": topic.sources if isinstance(topic.sources, dict) else {"sources": topic.sources},
            "created_at": topic.created_at.isoformat(),
        }
    }


@router.post("/paste")
def paste_research(req: PasteRequest, db: Session = Depends(get_db)):
    """
    Save manually pasted research text (e.g. from Grok) as a research_topics record.
    Returns research_id for use in the insights step.
    """
    topic = ResearchTopic(
        project_id=req.project_id,
        query=req.query,
        sources=["grok_manual"],
        source="grok_manual",
        insights=None,
    )
    # Store pasted text inside sources data — wrap as a dict so insights step can read it
    topic.sources = {"grok_manual": req.text}
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return {"research_id": topic.id, "query": req.query, "source": "grok_manual"}
