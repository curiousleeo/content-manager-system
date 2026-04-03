"""
Migration v6:
  - content_drafts: add auto_queue boolean (default false)
  - niche_reports: add status column (pending | injected | discarded)
Run once:
  DATABASE_URL=<url> python migrate_v6.py
"""
import os
from sqlalchemy import create_engine, text

# Set DATABASE_URL in your environment before running this script.
# Example: DATABASE_URL=postgresql://user:password@host:port/dbname python migrate_v6.py
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL)

SQL = """
ALTER TABLE content_drafts
  ADD COLUMN IF NOT EXISTS auto_queue BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE niche_reports
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_content_drafts_auto_queue
  ON content_drafts (project_id, auto_queue, status, created_at)
  WHERE auto_queue = TRUE;
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
    print("Migration v6 complete.")
