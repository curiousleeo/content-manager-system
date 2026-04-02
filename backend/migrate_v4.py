"""
Migration v4: Add post_analytics table
Run once against Railway:
  DATABASE_URL=<url> python migrate_v4.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:uUPcjTofnBfVbDtPmzTrykCdxCKFuvCu@interchange.proxy.rlwy.net:13204/railway",
)

engine = create_engine(DATABASE_URL)

SQL = """
CREATE TABLE IF NOT EXISTS post_analytics (
    id          SERIAL PRIMARY KEY,
    draft_id    INTEGER REFERENCES content_drafts(id) ON DELETE CASCADE,
    tweet_id    VARCHAR(50) NOT NULL,
    impressions INTEGER     NOT NULL DEFAULT 0,
    likes       INTEGER     NOT NULL DEFAULT 0,
    replies     INTEGER     NOT NULL DEFAULT 0,
    retweets    INTEGER     NOT NULL DEFAULT 0,
    pulled_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (tweet_id)
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_draft ON post_analytics (draft_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_pulled ON post_analytics (pulled_at DESC);
"""

if __name__ == "__main__":
    with engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
    print("Migration v4 complete — post_analytics created.")
