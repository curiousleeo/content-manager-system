"""
Migration v7:
  - projects: add timezone column (IANA timezone name, default 'UTC')
  - content_drafts: add 'processing' status value to the enum

Run once:
  DATABASE_URL=<url> python migrate_v7.py
"""
import os
from sqlalchemy import create_engine, text

# Set DATABASE_URL in your environment before running this script.
# Example: DATABASE_URL=postgresql://user:password@host:port/dbname python migrate_v7.py
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL)

SQL = """
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'UTC';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'processing'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'contentstatus'
      )
  ) THEN
    ALTER TYPE contentstatus ADD VALUE 'processing';
  END IF;
END$$;
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
    print("Migration v7 complete.")
