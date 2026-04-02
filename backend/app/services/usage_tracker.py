from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notifications import ApiUsage, Notification

# Monthly limits per service
LIMITS = {
    "x_posts": 1500,       # X free tier: 1,500 tweet writes/month
    "claude_calls": 500,   # Soft warning: 500 Claude API calls/month
    "grok_calls": 200,     # xAI free credits: ~200 research calls/month
}


def record_usage(db: Session, service: str) -> None:
    """
    Increment usage counter for a service.
    Creates a platform notification the first time 90% threshold is crossed.
    """
    limit = LIMITS.get(service, 1000)
    year_month = datetime.utcnow().strftime("%Y-%m")

    usage = (
        db.query(ApiUsage)
        .filter(ApiUsage.service == service, ApiUsage.year_month == year_month)
        .first()
    )
    if not usage:
        usage = ApiUsage(service=service, year_month=year_month, count=0, monthly_limit=limit)
        db.add(usage)
        db.flush()

    prev_count = usage.count
    usage.count += 1
    db.flush()

    prev_pct = prev_count / limit
    new_pct = usage.count / limit

    # Fire notification exactly when crossing 90%
    if new_pct >= 0.9 and prev_pct < 0.9:
        _create_usage_warning(db, service, usage.count, limit)

    # Fire again at 100%
    if new_pct >= 1.0 and prev_pct < 1.0:
        _create_limit_hit(db, service, usage.count, limit)

    db.commit()


def _service_label(service: str) -> str:
    return {
        "x_posts": "X (Twitter) Posts",
        "claude_calls": "Claude AI Calls",
        "grok_calls": "Grok Research Calls",
    }.get(service, service)


def _create_usage_warning(db: Session, service: str, count: int, limit: int) -> None:
    pct = int((count / limit) * 100)
    label = _service_label(service)
    db.add(Notification(
        type="usage_warning",
        title=f"{label} — {pct}% of monthly limit used",
        message=f"You've used {count:,} of {limit:,} {label} this month. "
                f"At this rate you may hit the limit before the month ends.",
    ))


def _create_limit_hit(db: Session, service: str, count: int, limit: int) -> None:
    label = _service_label(service)
    db.add(Notification(
        type="usage_warning",
        title=f"{label} — Monthly limit reached",
        message=f"You've reached {limit:,} {label} this month. "
                f"Posting or API calls may be blocked until next billing cycle.",
    ))


def is_daily_cap_hit(db: Session, service: str, daily_cap: int) -> bool:
    """Check if a service has hit its daily call cap."""
    from app.models.content import ContentDraft  # avoid circular
    today = datetime.utcnow().date()
    year_month = datetime.utcnow().strftime("%Y-%m")
    # We track monthly; approximate daily by dividing monthly count by days elapsed
    usage = (
        db.query(ApiUsage)
        .filter(ApiUsage.service == service, ApiUsage.year_month == year_month)
        .first()
    )
    if not usage:
        return False
    day_of_month = datetime.utcnow().day
    daily_avg = usage.count / day_of_month
    return daily_avg >= daily_cap


def get_usage_stats(db: Session) -> list[dict]:
    """Return current month usage for all services."""
    year_month = datetime.utcnow().strftime("%Y-%m")
    rows = db.query(ApiUsage).filter(ApiUsage.year_month == year_month).all()
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
