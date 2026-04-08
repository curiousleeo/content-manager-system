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
    """Add new columns to existing tables. Safe to run on every startup — uses IF NOT EXISTS."""
    migrations = [
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS x_bearer_token TEXT",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS personal_x_handle VARCHAR(100)",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS personal_x_user_id VARCHAR(30)",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS audit_auto_fetch JSONB DEFAULT 'false'::jsonb",
        # Cast existing BOOLEAN column to JSONB (safe no-op if already JSONB)
        "ALTER TABLE projects ALTER COLUMN audit_auto_fetch TYPE JSONB USING audit_auto_fetch::text::jsonb",
    ]
    is_sqlite = engine.dialect.name == "sqlite"
    with engine.connect() as conn:
        for sql in migrations:
            try:
                if is_sqlite:
                    # SQLite doesn't support IF NOT EXISTS on ALTER TABLE
                    # Check manually
                    col_name = sql.split("ADD COLUMN IF NOT EXISTS ")[-1].split()[0]
                    table_name = sql.split("ALTER TABLE ")[1].split()[0]
                    from sqlalchemy import text, inspect
                    inspector = inspect(engine)
                    existing = [c["name"] for c in inspector.get_columns(table_name)]
                    if col_name in existing:
                        continue
                    sql = sql.replace("IF NOT EXISTS ", "")
                from sqlalchemy import text
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
