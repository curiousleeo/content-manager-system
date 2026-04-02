"""
Migration v2 — run once on Railway.
1. Add tweet_id column to content_drafts
2. Add project_id column to api_usage
3. Add project_id column to notifications

Usage: python migrate_v2.py
"""
import psycopg2

PUBLIC_URL = "postgresql://postgres:uUPcjTofnBfVbDtPmzTrykCdxCKFuvCu@interchange.proxy.rlwy.net:13204/railway"

SQL = """
ALTER TABLE content_drafts
    ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(50);

ALTER TABLE api_usage
    ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Drop the old unique constraint and replace with per-project one
ALTER TABLE api_usage
    DROP CONSTRAINT IF EXISTS api_usage_service_year_month_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_usage_project_service_month
    ON api_usage (COALESCE(project_id, 0), service, year_month);
"""

conn = psycopg2.connect(PUBLIC_URL)
conn.autocommit = True
cur = conn.cursor()
cur.execute(SQL)
print("Migration v2 complete.")
cur.close()
conn.close()
