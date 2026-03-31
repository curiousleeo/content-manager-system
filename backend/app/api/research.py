from fastapi import APIRouter
from pydantic import BaseModel
from app.scrapers import x_scraper, reddit_scraper, google_scraper

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str
    sources: list[str] = ["x", "reddit", "youtube", "google_trends"]
    subreddits: list[str] = []


@router.post("/run")
def run_research(req: ResearchRequest):
    results = {}

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


@router.get("/trending/x")
def get_x_trending():
    return {"trending": x_scraper.get_trending()}
