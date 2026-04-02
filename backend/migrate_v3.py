"""
Migration v3: Add niche intelligence tables
  - watched_accounts
  - niche_reports
Run once against Railway:
  DATABASE_URL=<url> python migrate_v3.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:uUPcjTofnBfVbDtPmzTrykCdxCKFuvCu@interchange.proxy.rlwy.net:13204/railway",
)

engine = create_engine(DATABASE_URL)

SQL = """
CREATE TABLE IF NOT EXISTS watched_accounts (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    x_handle    VARCHAR(100) NOT NULL,
    category    VARCHAR(50)  NOT NULL DEFAULT 'competitor',  -- competitor | kol | ecosystem
    added_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, x_handle)
);

CREATE TABLE IF NOT EXISTS niche_reports (
    id                SERIAL PRIMARY KEY,
    project_id        INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    report_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
    accounts_analyzed INTEGER     NOT NULL DEFAULT 0,
    patterns          JSONB,
    swipe_file        JSONB,
    created_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watched_accounts_project ON watched_accounts (project_id);
CREATE INDEX IF NOT EXISTS idx_niche_reports_project_date ON niche_reports (project_id, report_date DESC);
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
    print("Migration v3 complete — watched_accounts and niche_reports created.")
