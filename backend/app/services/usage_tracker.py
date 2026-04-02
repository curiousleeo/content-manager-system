from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notifications import ApiUsage, Notification

LIMITS = {
    "x_posts": 1500,
    "claude_calls": 500,
    "grok_calls": 200,
}


def record_usage(db: Session, service: str, project_id: int | None = None) -> None:
    """
    Increment usage counter for a service, scoped per project.
    Fires a notification the first time 90% and 100% thresholds are crossed.
    """
    limit = LIMITS.get(service, 1000)
    year_month = datetime.utcnow().strftime("%Y-%m")

    usage = (
        db.query(ApiUsage)
        .filter(
            ApiUsage.service == service,
            ApiUsage.year_month == year_month,
            ApiUsage.project_id == project_id,
        )
        .first()
    )
    if not usage:
        usage = ApiUsage(
            service=service,
            year_month=year_month,
            count=0,
            monthly_limit=limit,
            project_id=project_id,
        )
        db.add(usage)
        db.flush()

    prev_count = usage.count
    usage.count += 1
    db.flush()

    prev_pct = prev_count / limit
    new_pct = usage.count / limit

    if new_pct >= 0.9 and prev_pct < 0.9:
        _create_usage_warning(db, service, usage.count, limit, project_id)

    if new_pct >= 1.0 and prev_pct < 1.0:
        _create_limit_hit(db, service, usage.count, limit, project_id)

    db.commit()


def _service_label(service: str) -> str:
    return {
        "x_posts": "X (Twitter) Posts",
        "claude_calls": "Claude AI Calls",
        "grok_calls": "Grok Research Calls",
    }.get(service, service)


def _create_usage_warning(db: Session, service: str, count: int, limit: int, project_id: int | None) -> None:
    pct = int((count / limit) * 100)
    label = _service_label(service)
    db.add(Notification(
        type="usage_warning",
        project_id=project_id,
        title=f"{label} — {pct}% of monthly limit used",
        message=f"You've used {count:,} of {limit:,} {label} this month.",
    ))


def _create_limit_hit(db: Session, service: str, count: int, limit: int, project_id: int | None) -> None:
    label = _service_label(service)
    db.add(Notification(
        type="usage_warning",
        project_id=project_id,
        title=f"{label} — Monthly limit reached",
        message=f"You've reached {limit:,} {label} this month. Calls may be blocked.",
    ))


def get_usage_stats(db: Session, project_id: int | None = None) -> list[dict]:
    """Return current month usage for all services, scoped to project if given."""
    year_month = datetime.utcnow().strftime("%Y-%m")
    query = db.query(ApiUsage).filter(ApiUsage.year_month == year_month)
    if project_id is not None:
        query = query.filter(ApiUsage.project_id == project_id)
    rows = query.all()
    result = []
    for service, limit in LIMITS.items():
        row = next((r for r in rows if r.service == service), None)
        count = row.count if row else 0
        result.append({
            "service": service,
            "label": _service_label(service),
            "count": count,
            "limit": limit,
            "pct": round((count / limit) * 100, 1),
        })
    return result
