"""
Run once to create notifications and api_usage tables on Railway.
Usage: python migrate_notifications.py
"""
import psycopg2

PUBLIC_URL = "postgresql://postgres:uUPcjTofnBfVbDtPmzTrykCdxCKFuvCu@interchange.proxy.rlwy.net:13204/railway"

SQL = """
CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    type       VARCHAR(50)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    message    TEXT         NOT NULL,
    read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_usage (
    id            SERIAL PRIMARY KEY,
    service       VARCHAR(50) NOT NULL,
    year_month    VARCHAR(7)  NOT NULL,
    count         INTEGER     NOT NULL DEFAULT 0,
    monthly_limit INTEGER     NOT NULL,
    updated_at    TIMESTAMP   DEFAULT NOW(),
    UNIQUE(service, year_month)
);
"""

conn = psycopg2.connect(PUBLIC_URL)
conn.autocommit = True
cur = conn.cursor()
cur.execute(SQL)
print("Tables created (or already exist).")
cur.close()
conn.close()
