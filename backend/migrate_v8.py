"""
Migration v8 — Personal Tweet Audit

Adds:
  - projects.personal_x_handle
  - projects.personal_x_user_id
  - projects.audit_auto_fetch
  - personal_audits table
"""
import os
import psycopg2

DATABASE_URL = os.environ["DATABASE_URL"]

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS personal_x_handle VARCHAR(100),
  ADD COLUMN IF NOT EXISTS personal_x_user_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS audit_auto_fetch BOOLEAN DEFAULT FALSE;
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS personal_audits (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    audit_date TIMESTAMP NOT NULL DEFAULT NOW(),
    tweets_fetched JSONB,
    niche_report_id INTEGER REFERENCES niche_reports(id),
    audit_result JSONB,
    auto_fetched BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
""")

conn.commit()
cur.close()
conn.close()
print("Migration v8 complete.")
