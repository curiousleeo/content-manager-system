from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.content import WatchedAccount, NicheReport, Project, PersonalAudit
from app.scrapers.niche_scraper import scrape_watched_accounts, get_cache_status, _get_client, _lookup_user_id, _fetch_timeline, fetch_own_timeline
from app.services.niche_intelligence import analyze_niche
from app.services.tweet_auditor import audit_tweets
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


# ── Cached tweets ────────────────────────────────────────────────────────────

@router.get("/tweets")
def get_cached_tweets(project_id: int, db: Session = Depends(get_db)):
    """Return all cached tweets for every watched account in the project."""
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .order_by(WatchedAccount.added_at.asc())
        .all()
    )
    result = []
    for acc in accounts:
        tweets = acc.cached_tweets or []
        tweets_sorted = sorted(tweets, key=lambda t: t.get("likes", 0), reverse=True)
        result.append({
            "handle":     acc.x_handle,
            "category":   acc.category,
            "fetched_at": acc.fetched_at.isoformat() if acc.fetched_at else None,
            "count":      len(tweets_sorted),
            "tweets":     tweets_sorted,
        })
    return {"accounts": result}


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

    # Require a bearer token — either per-project or global fallback
    from app.core.config import settings as _settings
    effective_bearer = bearer or _settings.x_bearer_token or None
    if not effective_bearer:
        raise HTTPException(
            status_code=400,
            detail="No X bearer token configured. Add one in Project settings (Integrations tab) or set X_BEARER_TOKEN in your environment.",
        )

    # Scrape — passes WatchedAccount ORM objects directly (niche_scraper manages its own session)
    scraped = scrape_watched_accounts(accounts, auto=False, force=force, bearer_token=effective_bearer)

    # Count actual API calls made
    api_calls_made = sum(1 for s in scraped if not s.get("used_cache"))
    for _ in range(api_calls_made):
        record_usage(db, "x_reads", project_id=project_id)

    # Analyse with Claude
    try:
        report_data = analyze_niche(scraped, proj_ctx)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Claude analysis failed: {exc}")
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


def _normalize_insights(items: list) -> list[str]:
    """Flatten top_insights to plain strings regardless of what Claude returned."""
    result = []
    for i in items:
        if isinstance(i, str):
            result.append(i)
        elif isinstance(i, dict):
            result.append(i.get("insight") or i.get("text") or i.get("takeaway") or str(i))
        else:
            result.append(str(i))
    return result


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
        "top_insights":      _normalize_insights(patterns.get("top_insights", [])),
        "swipe_file":        r.swipe_file or [],
        "status":            r.status,
        "created_at":        r.created_at.isoformat(),
    }


# ── Personal Tweet Audit ──────────────────────────────────────────────────────

def _fetch_user_tweets(project: Project, db, bearer_token: str | None = None) -> list[dict]:
    """Fetch the user's own tweets. Uses OAuth 1.0a user context if credentials are set
    (bypasses pay-per-use billing), otherwise falls back to bearer token."""
    import tweepy as _tweepy
    from app.core.config import settings as _settings

    if not project.personal_x_handle:
        raise HTTPException(status_code=400, detail="No personal X handle set. Add it in Project → Integrations.")

    # Bearer token: global Railway env var takes precedence over stale project-level token
    token = bearer_token or _settings.x_bearer_token or project.x_bearer_token
    if not token:
        raise HTTPException(status_code=400, detail="No X bearer token configured.")
    fetch_client = _get_client(token)

    # Resolve user ID — use OAuth get_me() if available (avoids paid lookup),
    # otherwise look up by handle via bearer token
    if not project.personal_x_user_id:
        api_key   = project.x_api_key    or _settings.x_api_key
        api_secret= project.x_api_secret or _settings.x_api_secret
        acc_token = project.x_access_token or _settings.x_access_token
        acc_secret= project.x_access_token_secret or _settings.x_access_token_secret
        has_oauth = all([api_key, api_secret, acc_token, acc_secret])

        if has_oauth:
            try:
                oauth_client = _tweepy.Client(
                    consumer_key=api_key, consumer_secret=api_secret,
                    access_token=acc_token, access_token_secret=acc_secret,
                    wait_on_rate_limit=False,
                )
                me = oauth_client.get_me()
                user_id = str(me.data.id)
                project.personal_x_user_id = user_id
                db.commit()
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"get_me() failed: {type(e).__name__}: {e}")
        else:
            try:
                user_id = _lookup_user_id(fetch_client, project.personal_x_handle)
                project.personal_x_user_id = user_id
                db.commit()
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Could not resolve @{project.personal_x_handle}: {e}")
    else:
        user_id = project.personal_x_user_id

    # Fetch timeline with bearer token — exactly like competitor fetch
    try:
        tweets = fetch_own_timeline(fetch_client, user_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch timeline (user_id={user_id}): {type(e).__name__}: {e}")

    return tweets


@router.post("/audit/fetch")
def fetch_personal_tweets(project_id: int, db: Session = Depends(get_db)):
    """Fetch the user's own tweets and store them for audit. Does NOT run analysis."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tweets = _fetch_user_tweets(project, db)
    record_usage(db, "x_reads", project_id=project_id)

    audit = PersonalAudit(
        project_id=project_id,
        audit_date=datetime.utcnow(),
        tweets_fetched=tweets,
        auto_fetched=False,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    return {"audit_id": audit.id, "tweets_count": len(tweets), "status": "fetched"}


@router.post("/audit/{audit_id}/analyze")
def analyze_personal_audit(audit_id: int, db: Session = Depends(get_db)):
    """Run Claude audit on already-fetched tweets, comparing against injected niche report."""
    audit = db.query(PersonalAudit).filter(PersonalAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    tweets = audit.tweets_fetched or []
    if not tweets:
        raise HTTPException(status_code=400, detail="No tweets in this audit. Fetch first.")

    # Get the injected niche report
    niche_report_row = (
        db.query(NicheReport)
        .filter(NicheReport.project_id == audit.project_id, NicheReport.status == "injected")
        .order_by(NicheReport.report_date.desc())
        .first()
    )
    niche_data = {}
    if niche_report_row:
        patterns = niche_report_row.patterns or {}
        niche_data = {
            "hook_patterns": patterns.get("hook_patterns", []),
            "dominant_tone": patterns.get("dominant_tone", ""),
            "post_formats": patterns.get("post_formats", []),
            "swipe_file": niche_report_row.swipe_file or [],
        }
        audit.niche_report_id = niche_report_row.id

    project = db.query(Project).filter(Project.id == audit.project_id).first()
    proj_ctx = None
    if project:
        proj_ctx = {"tone": project.tone, "target_audience": project.target_audience}

    try:
        result = audit_tweets(tweets, niche_data, proj_ctx)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Audit analysis failed: {exc}")

    record_usage(db, "claude_calls", project_id=audit.project_id)

    audit.audit_result = result
    db.commit()

    return _serialize_audit(audit)


@router.get("/audit/latest")
def get_latest_audit(project_id: int, db: Session = Depends(get_db)):
    audit = (
        db.query(PersonalAudit)
        .filter(PersonalAudit.project_id == project_id)
        .order_by(PersonalAudit.audit_date.desc())
        .first()
    )
    return {"audit": _serialize_audit(audit) if audit else None}


class PasteAuditRequest(BaseModel):
    project_id: int
    tweets_text: str  # raw pasted text — each tweet separated by blank line or "---"


@router.post("/audit/paste")
def paste_and_audit(req: PasteAuditRequest, db: Session = Depends(get_db)):
    """Accept pasted tweet text, parse into tweets, run audit immediately. No X API needed."""
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Parse tweets — split on blank lines or "---" separators
    import re as _re
    raw_blocks = _re.split(r"\n\s*[-]{3,}\s*\n|\n{2,}", req.tweets_text.strip())
    tweets = []
    for block in raw_blocks:
        text = block.strip()
        if text:
            tweets.append({"id": f"pasted_{len(tweets)}", "text": text,
                           "likes": 0, "replies": 0, "retweets": 0, "impressions": 0})

    if not tweets:
        raise HTTPException(status_code=400, detail="No tweets found in pasted text.")
    if len(tweets) > 50:
        tweets = tweets[:50]  # cap at 50

    # Get injected niche report
    niche_report_row = (
        db.query(NicheReport)
        .filter(NicheReport.project_id == req.project_id, NicheReport.status == "injected")
        .order_by(NicheReport.report_date.desc())
        .first()
    )
    niche_data = {}
    niche_report_id = None
    if niche_report_row:
        patterns = niche_report_row.patterns or {}
        niche_data = {
            "hook_patterns": patterns.get("hook_patterns", []),
            "dominant_tone": patterns.get("dominant_tone", ""),
            "post_formats": patterns.get("post_formats", []),
            "swipe_file": niche_report_row.swipe_file or [],
        }
        niche_report_id = niche_report_row.id

    proj_ctx = {"tone": project.tone, "target_audience": project.target_audience}

    try:
        result = audit_tweets(tweets, niche_data, proj_ctx)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Audit analysis failed: {exc}")

    record_usage(db, "claude_calls", project_id=req.project_id)

    audit = PersonalAudit(
        project_id=req.project_id,
        audit_date=datetime.utcnow(),
        tweets_fetched=tweets,
        niche_report_id=niche_report_id,
        audit_result=result,
        auto_fetched=False,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    return _serialize_audit(audit)


@router.get("/audit/all")
def get_all_audits(project_id: int, db: Session = Depends(get_db)):
    audits = (
        db.query(PersonalAudit)
        .filter(PersonalAudit.project_id == project_id)
        .order_by(PersonalAudit.audit_date.desc())
        .limit(10)
        .all()
    )
    return {"audits": [_serialize_audit(a) for a in audits]}


def _serialize_audit(a: PersonalAudit) -> dict:
    return {
        "id":             a.id,
        "project_id":     a.project_id,
        "audit_date":     a.audit_date.isoformat(),
        "tweets_count":   len(a.tweets_fetched or []),
        "niche_report_id": a.niche_report_id,
        "audit_result":   a.audit_result,
        "auto_fetched":   bool(a.auto_fetched),
        "created_at":     a.created_at.isoformat(),
    }
