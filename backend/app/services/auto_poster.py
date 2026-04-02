"""
Auto-poster: runs at each project's scheduled posting times,
picks a rotating content pillar, generates + posts to X automatically.
"""
import logging
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.content import ContentDraft, ContentStatus, Platform, Project, NicheReport
from app.models.notifications import Notification
from app.services.claude_service import generate_content
from app.services.x_poster import post_tweet
from app.services.platform_compliance import hard_block_check
from app.services.usage_tracker import record_usage

log = logging.getLogger(__name__)

DAY_OF_WEEK_MAP = {
    "mon": "mon", "tue": "tue", "wed": "wed",
    "thu": "thu", "fri": "fri", "sat": "sat", "sun": "sun",
}


def auto_post_for_project(project_id: int) -> None:
    """Job function executed by APScheduler at each posting time."""
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return

        pillars = project.content_pillars or []
        if not pillars:
            log.warning("Project %s has no content pillars — skipping auto-post", project.name)
            return

        # Rotate pillars: pick based on how many posts have been made today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = (
            db.query(ContentDraft)
            .filter(ContentDraft.project_id == project_id, ContentDraft.created_at >= today_start)
            .count()
        )
        pillar = pillars[today_count % len(pillars)]

        proj_ctx = {
            "tone": project.tone,
            "style": project.style,
            "avoid": project.avoid,
            "target_audience": project.target_audience,
            "x_api_key": project.x_api_key,
            "x_api_secret": project.x_api_secret,
            "x_access_token": project.x_access_token,
            "x_access_token_secret": project.x_access_token_secret,
            "x_bearer_token": project.x_bearer_token,
        }

        # Load latest niche report if within 7 days
        cutoff = datetime.utcnow() - timedelta(days=7)
        niche_report_row = (
            db.query(NicheReport)
            .filter(NicheReport.project_id == project_id, NicheReport.report_date >= cutoff)
            .order_by(NicheReport.report_date.desc())
            .first()
        )
        niche_ctx = None
        if niche_report_row:
            patterns = niche_report_row.patterns or {}
            niche_ctx = {
                "dominant_tone": patterns.get("dominant_tone", ""),
                "hook_patterns": patterns.get("hook_patterns", []),
                "swipe_file": niche_report_row.swipe_file or [],
            }

        # Generate content
        log.info("Auto-posting for %s — pillar: %s", project.name, pillar)
        text = generate_content(pillar, {}, "x", project=proj_ctx, niche_report=niche_ctx)
        record_usage(db, "claude_calls")

        # Compliance check
        block = hard_block_check(text)
        if block:
            db.add(Notification(
                type="error",
                title=f"Auto-post blocked — {project.name}",
                message=f"Generated content failed compliance check: {block['message']}",
            ))
            db.commit()
            log.warning("Auto-post blocked for %s: %s", project.name, block["message"])
            return

        # Post to X
        post_result = post_tweet(text, project=proj_ctx)
        tweet_id = post_result.get("tweet_id")
        record_usage(db, "x_posts", project_id=project_id)

        # Save record
        db.add(ContentDraft(
            project_id=project_id,
            topic=pillar,
            platform=Platform.x,
            body=text,
            status=ContentStatus.posted,
            tweet_id=tweet_id,
            posted_at=datetime.utcnow(),
        ))
        db.commit()
        log.info("Auto-posted for %s: %s", project.name, text[:60])

    except Exception as e:
        log.exception("Auto-post failed for project %s", project_id)
        try:
            db.add(Notification(
                type="error",
                title=f"Auto-post failed — project #{project_id}",
                message=str(e)[:300],
            ))
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


def register_project_jobs(project: Project) -> int:
    """
    Register APScheduler cron jobs for one project.
    Returns the number of jobs registered.
    """
    from app.scheduler import scheduler

    days = project.posting_days or []
    times = project.posting_times or []
    if not days or not times:
        return 0

    dow = ",".join(DAY_OF_WEEK_MAP[d] for d in days if d in DAY_OF_WEEK_MAP)
    if not dow:
        return 0

    count = 0
    for t in times:
        try:
            hour, minute = map(int, t.split(":"))
        except ValueError:
            continue
        job_id = f"auto_post_{project.id}_{t.replace(':', '')}"
        # Remove existing job if any (handles re-registration on restart)
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass
        scheduler.add_job(
            auto_post_for_project,
            "cron",
            day_of_week=dow,
            hour=hour,
            minute=minute,
            args=[project.id],
            id=job_id,
        )
        log.info("Scheduled auto-post: project=%s day_of_week=%s at %s UTC", project.name, dow, t)
        count += 1

    return count


def run_niche_report_for_project(project_id: int) -> None:
    """Weekly cron job: scrape watched accounts and generate a niche intelligence report."""
    from app.scrapers.niche_scraper import scrape_watched_accounts
    from app.services.niche_intelligence import analyze_niche
    from app.models.content import WatchedAccount

    db = SessionLocal()
    try:
        accounts = db.query(WatchedAccount).filter(WatchedAccount.project_id == project_id).all()
        if not accounts:
            log.info("Niche report skipped — no watched accounts for project %d", project_id)
            return

        project = db.query(Project).filter(Project.id == project_id).first()
        proj_ctx = None
        if project:
            proj_ctx = {"tone": project.tone, "target_audience": project.target_audience}

        account_dicts = [{"x_handle": a.x_handle, "category": a.category} for a in accounts]
        scraped = scrape_watched_accounts(account_dicts)
        for _ in account_dicts:
            record_usage(db, "grok_calls", project_id=project_id)

        report_data = analyze_niche(scraped, proj_ctx)
        record_usage(db, "claude_calls", project_id=project_id)

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
        log.info("Niche report generated for project %d — %d accounts", project_id, len(accounts))
    except Exception as e:
        log.exception("Niche report failed for project %d", project_id)
        try:
            db.add(Notification(
                type="error",
                title=f"Niche report failed — project #{project_id}",
                message=str(e)[:300],
            ))
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


def register_all_projects() -> None:
    """Called at app startup — registers cron jobs for all projects that have a schedule."""
    from app.scheduler import scheduler

    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        total = 0
        for p in projects:
            n = register_project_jobs(p)
            total += n

            # Weekly niche report — every Monday at 06:00 UTC
            niche_job_id = f"niche_report_{p.id}"
            try:
                scheduler.remove_job(niche_job_id)
            except Exception:
                pass
            scheduler.add_job(
                run_niche_report_for_project,
                "cron",
                day_of_week="mon",
                hour=6,
                minute=0,
                args=[p.id],
                id=niche_job_id,
            )
            log.info("Scheduled weekly niche report: project=%s every Monday 06:00 UTC", p.name)

        log.info("Auto-poster: registered %d cron jobs across %d projects", total, len(projects))

        # Daily analytics pull — 06:00 UTC (single job covers all projects)
        try:
            scheduler.remove_job("daily_analytics_pull")
        except Exception:
            pass
        from app.services.analytics_puller import pull_all_projects
        scheduler.add_job(
            pull_all_projects,
            "cron",
            hour=6,
            minute=0,
            id="daily_analytics_pull",
        )
        log.info("Scheduled daily analytics pull at 06:00 UTC")
    finally:
        db.close()
