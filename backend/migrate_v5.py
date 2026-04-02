"""
Migration v5: Cost optimisation refactor
  - projects: add coingecko_enabled, telegram_channels
  - watched_accounts: add x_user_id, cached_tweets, fetched_at
  - research_topics: add source column
Run once:
  DATABASE_URL=<url> python migrate_v5.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:uUPcjTofnBfVbDtPmzTrykCdxCKFuvCu@interchange.proxy.rlwy.net:13204/railway",
)

engine = create_engine(DATABASE_URL)

SQL = """
-- projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS coingecko_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_channels  JSONB;

-- watched_accounts
ALTER TABLE watched_accounts
  ADD COLUMN IF NOT EXISTS x_user_id     VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cached_tweets JSONB,
  ADD COLUMN IF NOT EXISTS fetched_at    TIMESTAMP;

-- research_topics
ALTER TABLE research_topics
  ADD COLUMN IF NOT EXISTS source VARCHAR(50);
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
    print("Migration v5 complete.")
