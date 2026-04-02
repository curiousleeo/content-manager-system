from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import WatchedAccount, NicheReport, Project
from app.scrapers.niche_scraper import scrape_watched_accounts
from app.services.niche_intelligence import analyze_niche
from app.services.usage_tracker import record_usage

router = APIRouter()


# ── Request models ────────────────────────────────────────────────────────────

class AddAccountRequest(BaseModel):
    project_id: int
    x_handle: str
    category: str = "competitor"  # competitor | kol | ecosystem


# ── Watched accounts ──────────────────────────────────────────────────────────

@router.get("/accounts")
def list_accounts(project_id: int, db: Session = Depends(get_db)):
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .order_by(WatchedAccount.added_at.desc())
        .all()
    )
    return {
        "accounts": [
            {
                "id": a.id,
                "x_handle": a.x_handle,
                "category": a.category,
                "added_at": a.added_at.isoformat(),
            }
            for a in accounts
        ]
    }


@router.post("/accounts")
def add_account(req: AddAccountRequest, db: Session = Depends(get_db)):
    handle = req.x_handle.lstrip("@").strip().lower()
    if not handle:
        raise HTTPException(status_code=400, detail="x_handle is required")
    existing = (
        db.query(WatchedAccount)
        .filter(
            WatchedAccount.project_id == req.project_id,
            WatchedAccount.x_handle == handle,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Account already watched")

    acc = WatchedAccount(
        project_id=req.project_id,
        x_handle=handle,
        category=req.category,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return {"id": acc.id, "x_handle": acc.x_handle, "category": acc.category}


@router.delete("/accounts/{account_id}")
def remove_account(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(WatchedAccount).filter(WatchedAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(acc)
    db.commit()
    return {"status": "removed"}


# ── Niche report ──────────────────────────────────────────────────────────────

@router.post("/report")
def run_niche_report(project_id: int, db: Session = Depends(get_db)):
    """Scrape watched accounts, analyse with Claude, save report. Returns the report."""
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .all()
    )
    if not accounts:
        raise HTTPException(status_code=400, detail="No watched accounts for this project")

    project = db.query(Project).filter(Project.id == project_id).first()
    proj_ctx = None
    if project:
        proj_ctx = {
            "tone": project.tone,
            "target_audience": project.target_audience,
        }

    # Scrape — costs Grok credits (1 call per account)
    account_dicts = [{"x_handle": a.x_handle, "category": a.category} for a in accounts]
    scraped = scrape_watched_accounts(account_dicts)
    for _ in account_dicts:
        record_usage(db, "grok_calls", project_id=project_id)

    # Analyse with Claude
    report_data = analyze_niche(scraped, proj_ctx)
    record_usage(db, "claude_calls", project_id=project_id)

    # Save report
    report = NicheReport(
        project_id=project_id,
        report_date=datetime.utcnow(),
        accounts_analyzed=len(accounts),
        patterns={
            "hook_patterns": report_data.get("hook_patterns", []),
            "dominant_tone": report_data.get("dominant_tone", ""),
            "post_formats": report_data.get("post_formats", []),
            "top_insights": report_data.get("top_insights", []),
        },
        swipe_file=report_data.get("swipe_file", []),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return _serialize_report(report)


@router.get("/report/latest")
def get_latest_report(project_id: int, db: Session = Depends(get_db)):
    """Get the most recent report for a project, or null if none exists."""
    report = (
        db.query(NicheReport)
        .filter(NicheReport.project_id == project_id)
        .order_by(NicheReport.report_date.desc())
        .first()
    )
    if not report:
        return {"report": None}
    return {"report": _serialize_report(report)}


def _serialize_report(r: NicheReport) -> dict:
    patterns = r.patterns or {}
    return {
        "id": r.id,
        "project_id": r.project_id,
        "report_date": r.report_date.isoformat(),
        "accounts_analyzed": r.accounts_analyzed,
        "hook_patterns": patterns.get("hook_patterns", []),
        "dominant_tone": patterns.get("dominant_tone", ""),
        "post_formats": patterns.get("post_formats", []),
        "top_insights": patterns.get("top_insights", []),
        "swipe_file": r.swipe_file or [],
        "created_at": r.created_at.isoformat(),
    }
