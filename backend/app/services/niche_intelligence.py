"""
Niche Intelligence — Claude service that analyzes scraped account data to produce:
  - Top hook patterns (ranked by frequency + performance)
  - Dominant tone across the niche
  - Post format breakdown
  - Swipe file: 10 best examples worth studying
"""
import re
import json
import logging
import anthropic
from app.core.config import settings
from app.services.claude_service import _parse_json

log = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-sonnet-4-6"


def analyze_niche(scraped_data: list[dict], project_context: dict | None = None) -> dict:
    """
    Takes output from niche_scraper.scrape_watched_accounts() and returns
    a structured intelligence report.

    Returns:
    {
      "hook_patterns": [{"type": str, "frequency": int, "effectiveness": str, "example": str}],
      "dominant_tone": str,
      "post_formats": [{"format": str, "frequency": int, "best_for": str}],
      "swipe_file": [{"handle": str, "text": str, "hook_type": str, "why": str}],
      "top_insights": [str],   # 3-5 actionable takeaways
    }
    """
    proj_note = ""
    if project_context:
        parts = []
        if project_context.get("tone"):
            parts.append(f"Our tone: {project_context['tone']}")
        if project_context.get("target_audience"):
            parts.append(f"Our audience: {project_context['target_audience']}")
        if parts:
            proj_note = "\n\nOur project context (use this to frame relevance):\n" + "\n".join(f"- {p}" for p in parts)

    # Condense scraped data into a flat list of posts for the prompt.
    # Cap at 25 posts per account (top by likes) to keep the prompt size bounded.
    all_posts = []
    for account in scraped_data:
        handle = account.get("handle", "unknown")
        category = account.get("category", "competitor")
        posts = account.get("posts", [])
        posts = sorted(posts, key=lambda p: p.get("likes", 0), reverse=True)[:25]
        for post in posts:
            text = post.get("text", "")[:400]  # cap text length
            all_posts.append({
                "handle": handle,
                "category": category,
                "text": text,
                "likes": post.get("likes", 0),
            })

    if not all_posts:
        return {
            "hook_patterns": [],
            "dominant_tone": "unknown",
            "post_formats": [],
            "swipe_file": [],
            "top_insights": ["No posts found — add watched accounts and re-run."],
        }

    prompt = f"""You are a content strategist analyzing competitor and KOL posts on X (Twitter).

Here are recent top-performing posts from accounts in this niche:
{json.dumps(all_posts, indent=2)}
{proj_note}

Analyze all posts and return a JSON object with:

1. "hook_patterns": array of hook types that appear most frequently and work best.
   Each item: {{"type": str, "frequency": int, "effectiveness": "high|medium|low", "example": str (copy from the posts)}}
   Sort by effectiveness then frequency.

2. "dominant_tone": single string describing the overall tone of high-performing posts
   (e.g. "direct and data-driven", "casual and opinionated", "educational but punchy")

3. "post_formats": breakdown of post structures used.
   Each item: {{"format": str, "frequency": int, "best_for": str (what content type this format suits)}}
   Sort by frequency.

4. "swipe_file": the 10 best posts worth saving as examples/inspiration.
   Each item: {{"handle": str, "text": str, "hook_type": str, "why": str (1 sentence)}}
   Pick the most diverse set — different hooks, formats, topics.

5. "top_insights": array of 3-5 actionable takeaways for creating better content in this niche.
   Be specific and practical. Reference patterns you actually observed.

Return ONLY valid JSON, no markdown, no explanation."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text
    # Strip markdown fences, then find the first { to handle any leading prose
    raw = raw.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = raw.rstrip('`').strip()
    start = raw.find('{')
    if start > 0:
        raw = raw[start:]
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Claude returned non-JSON response: {exc}. Raw: {raw[:300]}")
