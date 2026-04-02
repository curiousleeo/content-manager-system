from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.scrapers import x_scraper, reddit_scraper, google_scraper
from app.scrapers import grok_scraper
from app.core.database import get_db
from app.services.usage_tracker import record_usage

router = APIRouter()

GROK_DAILY_CAP = 20  # max Grok calls per day


class ResearchRequest(BaseModel):
    query: str
    sources: list[str] = ["grok", "reddit", "google_trends"]
    subreddits: list[str] = []


@router.post("/run")
def run_research(req: ResearchRequest, db: Session = Depends(get_db)):
    results = {}

    if "grok" in req.sources:
        results["grok"] = grok_scraper.search_x_conversations(req.query)
        record_usage(db, "grok_calls")

    if "x" in req.sources:
        results["x"] = x_scraper.search_recent(req.query)

    if "reddit" in req.sources:
        results["reddit"] = reddit_scraper.search_posts(
            req.query, subreddits=req.subreddits or None
        )

    if "youtube" in req.sources:
        results["youtube"] = google_scraper.search_youtube(req.query)

    if "google_trends" in req.sources:
        results["google_trends"] = google_scraper.google_trends_related(req.query)

    return {"query": req.query, "data": results}


@router.get("/trending")
def get_trending(db: Session = Depends(get_db)):
    topics = grok_scraper.get_trending_topics("crypto trading DeFi perps")
    record_usage(db, "grok_calls")
    return {"trending": topics}
