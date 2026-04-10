from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models.content import Base  # noqa: F401
import app.models.notifications  # noqa: F401 — registers Notification + ApiUsage with Base

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    _run_column_migrations()


def _run_column_migrations():
    """Add new columns to existing tables. Safe to run on every startup."""
    # ADD COLUMN migrations — IF NOT EXISTS makes these safe to re-run
    add_col_migrations = [
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS x_bearer_token TEXT",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS personal_x_handle VARCHAR(100)",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS personal_x_user_id VARCHAR(30)",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS audit_auto_fetch BOOLEAN DEFAULT FALSE",
        # brand_brains table — created by create_all, but column guards for safety
        "ALTER TABLE brand_brains ADD COLUMN IF NOT EXISTS mission TEXT",
        "ALTER TABLE brand_brains ADD COLUMN IF NOT EXISTS competitor_gap TEXT",
        # feedback loop — performance score written after analytics pull
        "ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS performance_score JSON",
    ]

    is_sqlite = engine.dialect.name == "sqlite"
    with engine.connect() as conn:
        from sqlalchemy import text, inspect

        # One-time fix: clear stale project-level bearer tokens so they fall back to env var
        try:
            conn.execute(text("UPDATE projects SET x_bearer_token = NULL WHERE x_bearer_token IS NOT NULL AND x_bearer_token != ''"))
            conn.commit()
            print("[db.migration] Cleared stale project bearer tokens → will use Railway X_BEARER_TOKEN", flush=True)
        except Exception as e:
            conn.rollback()
            print(f"[db.migration] bearer token clear skipped: {e}", flush=True)

        for sql in add_col_migrations:
            try:
                if is_sqlite:
                    col_name = sql.split("ADD COLUMN IF NOT EXISTS ")[-1].split()[0]
                    table_name = sql.split("ALTER TABLE ")[1].split()[0]
                    inspector = inspect(engine)
                    existing = [c["name"] for c in inspector.get_columns(table_name)]
                    if col_name in existing:
                        continue
                    sql = sql.replace("IF NOT EXISTS ", "")
                conn.execute(text(sql))
                conn.commit()
                print(f"[db.migration] OK: {sql[:90]}", flush=True)
            except Exception as e:
                conn.rollback()
                print(f"[db.migration] skipped ({type(e).__name__}: {e}): {sql[:90]}", flush=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
