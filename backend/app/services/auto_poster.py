"""
Auto-poster: runs at each project's scheduled posting times,
picks a rotating content pillar, generates + posts to X automatically.
"""
import logging
import pytz
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.content import ContentDraft, ContentStatus, Platform, Project, BrandBrain, NicheReport, ResearchTopic
from app.models.notifications import Notification
from app.services.claude_service import generate_content
from app.services.example_bank import build_example_bank
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

        # Load brand brain
        brain_row = db.query(BrandBrain).filter(BrandBrain.project_id == project_id).first()
        brand_brain_ctx = None
        if brain_row:
            brand_brain_ctx = {
                "mission":        brain_row.mission,
                "core_beliefs":   brain_row.core_beliefs or [],
                "hard_nos":       brain_row.hard_nos or [],
                "topic_angles":   brain_row.topic_angles or {},
                "voice_examples": brain_row.voice_examples or [],
                "competitor_gap": brain_row.competitor_gap,
            }

        # Build example bank (competitor tweets + our own scored posts — no API calls)
        bank = build_example_bank(project_id, db)
        example_bank_ctx = bank if bank["has_data"] else None

        # ── Draft reservoir: claim oldest queued draft atomically ────────────
        # Phase 1: count available drafts (threshold check)
        queued_count = (
            db.query(ContentDraft)
            .filter(
                ContentDraft.project_id == project_id,
                ContentDraft.status == ContentStatus.draft,
                ContentDraft.auto_queue == True,  # noqa: E712
            )
            .count()
        )

        claimed_draft = None
        if queued_count >= 2:
            # Attempt to claim one draft atomically with a row-level lock.
            # FOR UPDATE SKIP LOCKED prevents two concurrent cron fires from
            # claiming the same row (e.g. on a manual trigger + scheduled fire overlap).
            try:
                candidate = (
                    db.query(ContentDraft)
                    .filter(
                        ContentDraft.project_id == project_id,
                        ContentDraft.status == ContentStatus.draft,
                        ContentDraft.auto_queue == True,  # noqa: E712
                    )
                    .order_by(ContentDraft.created_at.asc())
                    .with_for_update(skip_locked=True)
                    .first()
                )
            except Exception:
                # SQLite does not support FOR UPDATE — fall back to plain select
                candidate = (
                    db.query(ContentDraft)
                    .filter(
                        ContentDraft.project_id == project_id,
                        ContentDraft.status == ContentStatus.draft,
                        ContentDraft.auto_queue == True,  # noqa: E712
                    )
                    .order_by(ContentDraft.created_at.asc())
                    .first()
                )

            if candidate and candidate.status == ContentStatus.draft:
                # Mark as processing and commit before any external calls
                candidate.status = ContentStatus.processing
                db.commit()
                claimed_draft = candidate
                log.info("Claimed draft #%d for %s", claimed_draft.id, project.name)

        use_draft = claimed_draft is not None

        if use_draft:
            text = claimed_draft.body
            pillar = claimed_draft.topic or pillar
        else:
            # Fall back to live generation — pull latest research insights from DB
            latest_research = (
                db.query(ResearchTopic)
                .filter(
                    ResearchTopic.project_id == project_id,
                    ResearchTopic.insights.isnot(None),
                )
                .order_by(ResearchTopic.created_at.desc())
                .first()
            )
            research_insights = latest_research.insights if latest_research else {}
            log.info(
                "Auto-generating for %s — pillar: %s (queue=%d, research=%s)",
                project.name, pillar, queued_count,
                "loaded" if research_insights else "none",
            )
            text = generate_content(
                pillar, research_insights, "x",
                project=proj_ctx,
                example_bank=example_bank_ctx,
                brand_brain=brand_brain_ctx,
            )
            record_usage(db, "claude_calls")

        # Compliance check
        block = hard_block_check(text)
        if block:
            if use_draft:
                # Return the draft to the queue so it isn't silently lost
                claimed_draft.status = ContentStatus.draft
                db.commit()
            db.add(Notification(
                type="error",
                title=f"Auto-post blocked — {project.name}",
                message=f"Generated content failed compliance check: {block['message']}",
            ))
            db.commit()
            log.warning("Auto-post blocked for %s: %s", project.name, block["message"])
            return

        # Post to X
        try:
            post_result = post_tweet(text, project=proj_ctx)
        except Exception as post_err:
            if use_draft:
                # Reset draft to 'draft' so it re-enters the queue on next fire
                claimed_draft.status = ContentStatus.draft
                db.commit()
            raise post_err

        tweet_id = post_result.get("tweet_id")
        record_usage(db, "x_posts", project_id=project_id)

        if use_draft:
            claimed_draft.status = ContentStatus.posted
            claimed_draft.tweet_id = tweet_id
            claimed_draft.posted_at = datetime.utcnow()
        else:
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


def _local_time_to_utc(hour: int, minute: int, tz_name: str) -> tuple[int, int]:
    """
    Convert a local HH:MM in the given IANA timezone to UTC HH:MM.
    Uses today's date to account for DST. Returns (utc_hour, utc_minute).
    Falls back to the original values if the timezone string is invalid.
    """
    try:
        local_tz = pytz.timezone(tz_name)
    except pytz.exceptions.UnknownTimeZoneError:
        log.warning("Unknown timezone '%s' — treating posting times as UTC", tz_name)
        return hour, minute

    today = datetime.utcnow().date()
    naive_local = datetime(today.year, today.month, today.day, hour, minute)
    try:
        local_dt = local_tz.localize(naive_local, is_dst=None)
    except pytz.exceptions.AmbiguousTimeError:
        local_dt = local_tz.localize(naive_local, is_dst=False)
    except pytz.exceptions.NonExistentTimeError:
        # Time doesn't exist (e.g. spring-forward gap) — shift forward 1 hour
        local_dt = local_tz.localize(naive_local + timedelta(hours=1), is_dst=True)

    utc_dt = local_dt.astimezone(pytz.utc)
    return utc_dt.hour, utc_dt.minute


def register_project_jobs(project: Project) -> int:
    """
    Register APScheduler cron jobs for one project.
    posting_times are stored in the project's local timezone and converted to UTC here.
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

    project_tz = getattr(project, "timezone", None) or "UTC"

    count = 0
    for t in times:
        try:
            local_hour, local_minute = map(int, t.split(":"))
        except ValueError:
            continue

        utc_hour, utc_minute = _local_time_to_utc(local_hour, local_minute, project_tz)

        job_id = f"auto_post_{project.id}_{t.replace(':', '')}"
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass
        scheduler.add_job(
            auto_post_for_project,
            "cron",
            day_of_week=dow,
            hour=utc_hour,
            minute=utc_minute,
            args=[project.id],
            id=job_id,
        )
        log.info(
            "Scheduled auto-post: project=%s day_of_week=%s at %s %s (= %02d:%02d UTC)",
            project.name, dow, t, project_tz, utc_hour, utc_minute,
        )
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

        bearer = project.x_bearer_token if project else None
        # Pass ORM objects directly; scraper manages its own session for cache writes
        scraped = scrape_watched_accounts(accounts, auto=True, force=False, bearer_token=bearer)

        api_calls_made = sum(1 for s in scraped if not s.get("used_cache"))
        for _ in range(api_calls_made):
            record_usage(db, "x_reads", project_id=project_id)

        report_data = analyze_niche(scraped, proj_ctx)
        record_usage(db, "claude_calls", project_id=project_id)

        # Discard any previously injected report before adding the new one
        db.query(NicheReport).filter(
            NicheReport.project_id == project_id,
            NicheReport.status == "injected",
        ).update({"status": "discarded"})

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
            # Auto-inject — no manual step required. User can still discard via UI.
            status="injected",
        )
        db.add(report)

        db.add(Notification(
            type="info",
            title=f"Niche report auto-updated — {project.name if project else f'project #{project_id}'}",
            message="Weekly niche intelligence refreshed and injected automatically. Content generation is now using fresh competitor data.",
        ))

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


def run_tweet_audit_for_project(project_id: int) -> None:
    """Monday cron job: fetch user's own tweets and run Claude audit against niche benchmark."""
    from app.scrapers.niche_scraper import _get_client, _lookup_user_id, _fetch_timeline
    from app.services.tweet_auditor import audit_tweets
    from app.models.content import PersonalAudit

    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or not project.personal_x_handle:
            log.info("Tweet audit skipped for project %d — no personal handle set", project_id)
            return
        if not project.audit_auto_fetch:
            return

        from app.core.config import settings as _settings
        token = project.x_bearer_token or _settings.x_bearer_token
        if not token:
            log.warning("Tweet audit skipped for project %d — no bearer token", project_id)
            return

        client = _get_client(token)
        if not project.personal_x_user_id:
            user_id = _lookup_user_id(client, project.personal_x_handle)
            project.personal_x_user_id = user_id
            db.commit()
        else:
            user_id = project.personal_x_user_id

        tweets = _fetch_timeline(client, user_id)
        record_usage(db, "x_reads", project_id=project_id)

        # Get injected niche report
        niche_row = (
            db.query(NicheReport)
            .filter(NicheReport.project_id == project_id, NicheReport.status == "injected")
            .order_by(NicheReport.report_date.desc())
            .first()
        )
        niche_data = {}
        niche_report_id = None
        if niche_row:
            patterns = niche_row.patterns or {}
            niche_data = {
                "hook_patterns": patterns.get("hook_patterns", []),
                "dominant_tone": patterns.get("dominant_tone", ""),
                "post_formats": patterns.get("post_formats", []),
                "swipe_file": niche_row.swipe_file or [],
            }
            niche_report_id = niche_row.id

        proj_ctx = {"tone": project.tone, "target_audience": project.target_audience}
        result = audit_tweets(tweets, niche_data, proj_ctx)
        record_usage(db, "claude_calls", project_id=project_id)

        audit = PersonalAudit(
            project_id=project_id,
            audit_date=datetime.utcnow(),
            tweets_fetched=tweets,
            niche_report_id=niche_report_id,
            audit_result=result,
            auto_fetched=True,
        )
        db.add(audit)
        db.commit()
        log.info("Auto tweet audit complete for project %d — %d tweets", project_id, len(tweets))
    except Exception:
        log.exception("Auto tweet audit failed for project %d", project_id)
    finally:
        db.close()


def _recover_stale_processing_drafts(db) -> None:
    """
    Reset any drafts stuck in 'processing' for more than 5 minutes back to 'draft'.
    These are drafts that were claimed by a previous process that crashed before posting.
    Called once at startup.
    """
    stale_cutoff = datetime.utcnow() - timedelta(minutes=5)
    stale = (
        db.query(ContentDraft)
        .filter(
            ContentDraft.status == ContentStatus.processing,
            ContentDraft.updated_at <= stale_cutoff,
        )
        .all()
    )
    if stale:
        for d in stale:
            d.status = ContentStatus.draft
        db.commit()
        log.info("Recovered %d stale processing draft(s) back to draft status", len(stale))


def register_all_projects() -> None:
    """Called at app startup — registers cron jobs for all projects that have a schedule."""
    from app.scheduler import scheduler

    db = SessionLocal()
    try:
        _recover_stale_processing_drafts(db)
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

            # Weekly tweet audit — every Monday at 07:00 UTC (1h after niche report)
            audit_job_id = f"tweet_audit_{p.id}"
            try:
                scheduler.remove_job(audit_job_id)
            except Exception:
                pass
            scheduler.add_job(
                run_tweet_audit_for_project,
                "cron",
                day_of_week="mon",
                hour=7,
                minute=0,
                args=[p.id],
                id=audit_job_id,
            )

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
