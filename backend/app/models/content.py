from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class ContentStatus(str, enum.Enum):
    draft = "draft"
    reviewed = "reviewed"
    scheduled = "scheduled"
    posted = "posted"
    failed = "failed"


class Platform(str, enum.Enum):
    x = "x"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Brand voice
    tone = Column(Text, nullable=True)          # e.g. "direct, no hype, trader-to-trader"
    style = Column(Text, nullable=True)          # e.g. "short sentences, first person"
    avoid = Column(Text, nullable=True)          # e.g. "buzzwords, emojis, corporate language"
    target_audience = Column(Text, nullable=True)

    # Content defaults
    content_pillars = Column(JSON, nullable=True)   # ["crypto perps", "self-custody", ...]
    default_subreddits = Column(JSON, nullable=True) # ["CryptoCurrency", "trading"]
    default_platform = Column(Enum(Platform), default=Platform.x)

    # Posting schedule
    posting_days = Column(JSON, nullable=True)   # ["mon", "wed", "fri"]
    posting_times = Column(JSON, nullable=True)  # ["09:00", "17:00"]

    # Per-project X API credentials
    x_api_key = Column(Text, nullable=True)
    x_api_secret = Column(Text, nullable=True)
    x_access_token = Column(Text, nullable=True)
    x_access_token_secret = Column(Text, nullable=True)
    x_bearer_token = Column(Text, nullable=True)
    x_client_id = Column(Text, nullable=True)
    x_client_secret = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContentDraft(Base):
    __tablename__ = "content_drafts"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    topic = Column(String(500))
    platform = Column(Enum(Platform))
    body = Column(Text)
    status = Column(Enum(ContentStatus), default=ContentStatus.draft)
    review_notes = Column(Text, nullable=True)
    insight_data = Column(JSON, nullable=True)
    tweet_id = Column(String(50), nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    posted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResearchTopic(Base):
    __tablename__ = "research_topics"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    query = Column(String(500))
    sources = Column(JSON)
    insights = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
