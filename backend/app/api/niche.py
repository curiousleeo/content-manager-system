from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import WatchedAccount, NicheReport, Project
from app.scrapers.niche_scraper import scrape_watched_accounts, get_cache_status
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
                "id":         a.id,
                "x_handle":   a.x_handle,
                "category":   a.category,
                "added_at":   a.added_at.isoformat(),
                "fetched_at": a.fetched_at.isoformat() if a.fetched_at else None,
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


# ── Cache status preview ──────────────────────────────────────────────────────

@router.get("/cache-status")
def cache_status(project_id: int, db: Session = Depends(get_db)):
    """
    Returns per-account cache status before running a report.
    Frontend shows this to the user so they know what will cost money.
    """
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .all()
    )
    statuses = [get_cache_status(a) for a in accounts]
    api_calls_needed = sum(1 for s in statuses if s["status"] in ("never_fetched", "stale"))
    return {
        "accounts": statuses,
        "api_calls_needed": api_calls_needed,
        "estimated_cost_usd": round(api_calls_needed * 0.01, 2),
    }


# ── Niche report ──────────────────────────────────────────────────────────────

@router.post("/report")
def run_niche_report(
    project_id: int,
    force: bool = Query(False, description="Re-fetch accounts even if cached (same-day block still applies)"),
    db: Session = Depends(get_db),
):
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .all()
    )
    if not accounts:
        raise HTTPException(status_code=400, detail="No watched accounts for this project")

    project = db.query(Project).filter(Project.id == project_id).first()
    proj_ctx = None
    bearer = None
    if project:
        proj_ctx = {"tone": project.tone, "target_audience": project.target_audience}
        bearer = project.x_bearer_token or None

    # Scrape — passes WatchedAccount ORM objects directly (niche_scraper manages its own session)
    scraped = scrape_watched_accounts(accounts, auto=False, force=force, bearer_token=bearer)

    # Count actual API calls made
    api_calls_made = sum(1 for s in scraped if not s.get("used_cache"))
    for _ in range(api_calls_made):
        record_usage(db, "x_reads", project_id=project_id)

    # Analyse with Claude
    report_data = analyze_niche(scraped, proj_ctx)
    record_usage(db, "claude_calls", project_id=project_id)

    # Build per-account fetch summary to return to frontend
    fetch_summary = [
        {
            "handle":     s["handle"],
            "used_cache": s.get("used_cache", True),
            "fetched_at": s.get("fetched_at"),
            "posts_count": len(s.get("posts", [])),
            "error":      s.get("error"),
        }
        for s in scraped
    ]

    # Save report
    report = NicheReport(
        project_id=project_id,
        report_date=datetime.utcnow(),
        accounts_analyzed=len(accounts),
        patterns={
            "hook_patterns": report_data.get("hook_patterns", []),
            "dominant_tone": report_data.get("dominant_tone", ""),
            "post_formats":  report_data.get("post_formats", []),
            "top_insights":  report_data.get("top_insights", []),
        },
        swipe_file=report_data.get("swipe_file", []),
        status="pending",  # user must inject before generation uses it
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    result = _serialize_report(report)
    result["fetch_summary"] = fetch_summary
    result["api_calls_made"] = api_calls_made
    return result


@router.get("/report/pending")
def get_pending_reports(project_id: int, db: Session = Depends(get_db)):
    """Return all reports with status=pending for a project."""
    reports = (
        db.query(NicheReport)
        .filter(NicheReport.project_id == project_id, NicheReport.status == "pending")
        .order_by(NicheReport.report_date.desc())
        .all()
    )
    return {"reports": [_serialize_report(r) for r in reports]}


@router.get("/report/all")
def get_all_reports(project_id: int, db: Session = Depends(get_db)):
    """Return all reports for a project (all statuses), for the auto-mode history list."""
    reports = (
        db.query(NicheReport)
        .filter(NicheReport.project_id == project_id)
        .order_by(NicheReport.report_date.desc())
        .limit(20)
        .all()
    )
    return {"reports": [_serialize_report(r) for r in reports]}


@router.post("/report/{report_id}/inject")
def inject_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(NicheReport).filter(NicheReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    # Discard any previously injected report for this project first
    db.query(NicheReport).filter(
        NicheReport.project_id == report.project_id,
        NicheReport.status == "injected",
    ).update({"status": "discarded"})
    report.status = "injected"
    db.commit()
    return {"status": "injected", "report_id": report_id}


@router.post("/report/{report_id}/discard")
def discard_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(NicheReport).filter(NicheReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "discarded"
    db.commit()
    return {"status": "discarded", "report_id": report_id}


@router.get("/report/latest")
def get_latest_report(project_id: int, db: Session = Depends(get_db)):
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
        "id":                r.id,
        "project_id":        r.project_id,
        "report_date":       r.report_date.isoformat(),
        "accounts_analyzed": r.accounts_analyzed,
        "hook_patterns":     patterns.get("hook_patterns", []),
        "dominant_tone":     patterns.get("dominant_tone", ""),
        "post_formats":      patterns.get("post_formats", []),
        "top_insights":      patterns.get("top_insights", []),
        "swipe_file":        r.swipe_file or [],
        "status":            r.status,
        "created_at":        r.created_at.isoformat(),
    }
