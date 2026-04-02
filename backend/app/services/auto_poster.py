"""
Auto-poster: runs at each project's scheduled posting times,
picks a rotating content pillar, generates + posts to X automatically.
"""
import logging
from datetime import datetime
from app.core.database import SessionLocal
from app.models.content import ContentDraft, ContentStatus, Platform, Project
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

        # Generate content
        log.info("Auto-posting for %s — pillar: %s", project.name, pillar)
        text = generate_content(pillar, {}, "x", project=proj_ctx)
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


def register_all_projects() -> None:
    """Called at app startup — registers cron jobs for all projects that have a schedule."""
    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        total = 0
        for p in projects:
            n = register_project_jobs(p)
            total += n
        log.info("Auto-poster: registered %d cron jobs across %d projects", total, len(projects))
    finally:
        db.close()
