"""
Niche scraper — uses Grok to pull recent top posts from watched X accounts.
For each handle, asks Grok for the top 10 posts in the last 7 days with
engagement signals, hook type, and post format.
"""
import re
import json
import logging
from app.scrapers.grok_scraper import _call_grok, _parse

log = logging.getLogger(__name__)


def scrape_account(handle: str, category: str = "competitor") -> dict:
    """
    Pull the top 10 posts from a watched account in the last 7 days.
    Returns a dict with handle, category, and posts list.
    Each post: text, hook_type, post_format, engagement_level, why_it_worked.
    """
    try:
        raw = _call_grok(
            system=(
                "You have real-time access to X (Twitter). "
                "Return only valid JSON, no markdown, no explanation."
            ),
            user=f"""Look at the X account @{handle} and find their top 10 posts from the last 7 days.

Return a JSON object with:
- "handle": "{handle}"
- "category": "{category}"
- "posts": array of up to 10 posts, each with:
  - "text": the post content (verbatim or close paraphrase)
  - "hook_type": opening hook style — one of: question, bold_claim, stat, story, list, contrarian, how_to, personal
  - "post_format": one of: plain_text, thread, list_post, single_insight, story_arc, engagement_bait
  - "engagement_level": high / medium / low
  - "why_it_worked": 1-sentence reason this post performed well

Focus only on original posts (not replies). Return ONLY valid JSON.""",
            max_tokens=2000,
        )
        return _parse(raw)
    except Exception as e:
        log.warning("niche_scraper: failed to scrape @%s: %s", handle, e)
        return {"handle": handle, "category": category, "posts": [], "error": str(e)}


def scrape_watched_accounts(accounts: list[dict]) -> list[dict]:
    """
    Scrape all watched accounts. accounts is a list of dicts with x_handle + category.
    Returns list of scrape results.
    """
    results = []
    for acc in accounts:
        result = scrape_account(acc["x_handle"], acc.get("category", "competitor"))
        results.append(result)
    return results
