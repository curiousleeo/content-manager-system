"""
Topic discovery — derives what content topics are currently getting traction
in the niche, directly from cached competitor tweet performance.

No X API calls. Reads WatchedAccount.cached_tweets (already in DB).
Uses Claude Haiku for cheap topic extraction from the top-performing posts.

Replaces Google Trends as the research data source.
"""
import json
import logging
import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.content import WatchedAccount
from app.services.example_bank import _engagement_score

log = logging.getLogger(__name__)
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-haiku-4-5-20251001"  # cheap — this is pure extraction, not reasoning


def discover_topics(project_id: int, db: Session, top_n: int = 30) -> dict:
    """
    Analyze cached competitor tweets and return what topics are getting
    the most engagement right now in this niche.

    Returns:
    {
      "topics": [
        {
          "topic":          str,   — e.g. "self-custody after exchange hacks"
          "angle":          str,   — e.g. "frame as table stakes, not a feature"
          "why_it_works":   str,   — 1 sentence
          "example_tweet":  str,   — real tweet text that validated this topic
          "handle":         str,   — which account
          "engagement":     int,   — score
        }
      ],
      "has_data": bool,
      "accounts_sampled": int,
      "posts_analyzed": int,
    }
    """
    if settings.pause_external_apis:
        return {"topics": [], "has_data": False, "accounts_sampled": 0, "posts_analyzed": 0}

    # ── Pull all cached tweets ────────────────────────────────────────────────
    accounts = (
        db.query(WatchedAccount)
        .filter(WatchedAccount.project_id == project_id)
        .all()
    )

    all_posts = []
    for acc in accounts:
        for tweet in (acc.cached_tweets or []):
            if not tweet.get("text", "").strip():
                continue
            all_posts.append({
                "handle":   acc.x_handle,
                "category": acc.category,
                "text":     tweet["text"][:300],
                "score":    _engagement_score(tweet),
                "likes":    tweet.get("likes", 0),
            })

    if not all_posts:
        return {"topics": [], "has_data": False, "accounts_sampled": len(accounts), "posts_analyzed": 0}

    # Sort and take top N by engagement
    all_posts.sort(key=lambda p: p["score"], reverse=True)
    top_posts = all_posts[:top_n]

    # ── Ask Claude Haiku to extract topics ───────────────────────────────────
    prompt = f"""You are analyzing the top {len(top_posts)} posts by engagement from competitor accounts in a crypto trading niche.

Here are the posts (sorted by engagement score, highest first):
{json.dumps(top_posts, indent=2)}

Identify the 6-8 distinct content TOPICS that are getting the most traction.
For each topic, return:
- topic: a specific topic name (not generic — e.g. "self-custody after exchange hacks", not "security")
- angle: the specific angle or take that made it resonate (e.g. "frame as table stakes, not a feature")
- why_it_works: one sentence on why this lands with this audience
- example_tweet: copy the exact text of the best tweet that represents this topic
- handle: the @handle that posted it
- engagement: the score field from that post

Return ONLY a valid JSON object:
{{"topics": [...]}}

No markdown, no explanation."""

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        # Strip any markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        topics = result.get("topics", [])
    except Exception as e:
        log.warning("topic_discovery: Claude extraction failed: %s", e)
        # Fallback: return top posts as raw topics without Claude synthesis
        topics = [
            {
                "topic": p["text"][:60] + "…",
                "angle": "",
                "why_it_works": "",
                "example_tweet": p["text"],
                "handle": p["handle"],
                "engagement": int(p["score"]),
            }
            for p in top_posts[:6]
        ]

    return {
        "topics": topics,
        "has_data": bool(topics),
        "accounts_sampled": len(accounts),
        "posts_analyzed": len(top_posts),
    }
