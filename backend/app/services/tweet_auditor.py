"""
Tweet Auditor — compares the user's own tweets against the injected niche report.

Strict benchmark: find real flaws, give concrete improvements.
Only improves tweets that actually need it — no forced rewrites.
Goal: match the engagement quality of the niche accounts being tracked.
"""
import re
import json
import logging
import anthropic
from app.core.config import settings

log = logging.getLogger(__name__)
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL = "claude-sonnet-4-6"


def audit_tweets(user_tweets: list[dict], niche_report: dict, project_context: dict | None = None) -> dict:
    """
    Compare user's tweets against niche patterns.

    Returns:
    {
      "overall_score": float (1-10),
      "overall_grade": str,
      "summary": str,
      "vs_niche": {
        "tone_match": str,
        "hook_quality": str,
        "format_alignment": str,
        "engagement_gap": str,
      },
      "strengths": [str],
      "weaknesses": [str],
      "tweet_reviews": [
        {
          "original": str,
          "likes": int,
          "replies": int,
          "score": int (1-10),
          "needs_improvement": bool,
          "issues": [str],
          "improved": str | null,
          "why_improved": str | null,
        }
      ]
    }
    """
    if not user_tweets:
        return {"error": "No tweets to audit."}

    # Build niche context summary
    niche_summary_parts = []
    if niche_report.get("dominant_tone"):
        niche_summary_parts.append(f"Dominant tone in niche: {niche_report['dominant_tone']}")
    if niche_report.get("hook_patterns"):
        top = niche_report["hook_patterns"][:5]
        hooks = [f"{h.get('type', '')} (×{h.get('frequency', 0)}, {h.get('effectiveness', '')})" for h in top]
        niche_summary_parts.append("Top hook patterns: " + ", ".join(hooks))
    if niche_report.get("post_formats"):
        formats = [f.get("format", "") for f in niche_report["post_formats"][:3]]
        niche_summary_parts.append("Dominant formats: " + ", ".join(formats))
    if niche_report.get("swipe_file"):
        examples = niche_report["swipe_file"][:3]
        ex_text = "\n".join(f'  @{e.get("handle","")}: "{e.get("text","")[:150]}"' for e in examples)
        niche_summary_parts.append(f"Example top-performing posts:\n{ex_text}")

    niche_context = "\n\n".join(niche_summary_parts)

    proj_note = ""
    if project_context:
        parts = []
        if project_context.get("tone"):
            parts.append(f"Intended tone: {project_context['tone']}")
        if project_context.get("target_audience"):
            parts.append(f"Target audience: {project_context['target_audience']}")
        if parts:
            proj_note = "\nProject context:\n" + "\n".join(f"- {p}" for p in parts)

    # Cap at 30 tweets, trim text
    tweets_for_prompt = []
    for t in user_tweets[:30]:
        tweets_for_prompt.append({
            "text": t.get("text", "")[:400],
            "likes": t.get("likes", 0),
            "replies": t.get("replies", 0),
            "retweets": t.get("retweets", 0),
        })

    prompt = f"""You are a brutal but fair content strategist. Your job is to audit someone's tweets and compare them against the top-performing accounts in their niche.

Be strict. Do not soften criticism. If something is bad, say it is bad and explain why. If something is good, acknowledge it. The goal is real improvement, not motivation.

--- NICHE BENCHMARK ---
{niche_context}
{proj_note}

--- USER'S TWEETS (past 7 days) ---
{json.dumps(tweets_for_prompt, indent=2)}

--- YOUR TASK ---

Analyze the user's tweets against the niche benchmark. Return a JSON object with:

1. "overall_score": number 1-10 (honest score against niche quality)
2. "overall_grade": letter grade (A/B/C/D/F with + or -)
3. "summary": 2-3 sentence honest overall verdict. What's working, what isn't, why engagement is high or low.
4. "vs_niche": object with:
   - "tone_match": how well their tone matches the niche (e.g. "off — too formal, niche is casual and punchy")
   - "hook_quality": assessment of their opening lines vs niche hooks
   - "format_alignment": are they using formats that work in this niche?
   - "engagement_gap": concrete gap statement (e.g. "Your avg 8 likes vs niche avg ~150")
5. "strengths": array of 2-4 specific things they're doing right (be specific, not generic)
6. "weaknesses": array of 3-5 specific, actionable flaws. Reference actual tweet patterns you saw.
7. "tweet_reviews": array — review EVERY tweet. For each:
   - "original": the tweet text (copy exactly)
   - "likes": the like count
   - "replies": the reply count
   - "score": 1-10
   - "needs_improvement": true if score <= 6 OR if a clear rewrite would significantly improve it
   - "issues": array of specific problems (empty array if none)
   - "improved": rewritten version if needs_improvement=true, otherwise null
   - "why_improved": one sentence explaining what the rewrite fixes, null if not improved

Rules for rewrites:
- Only rewrite if there is a meaningful improvement to make
- Do NOT force rewrites on already-good tweets (score 7+) unless there's a clear fix
- Rewrites must use hook patterns that actually work in this niche
- Keep the core idea — improve the execution, not the topic
- Match the niche's dominant tone and format

Return ONLY valid JSON, no markdown, no explanation."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = raw.rstrip('`').strip()
    start = raw.find('{')
    if start > 0:
        raw = raw[start:]

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Auditor returned non-JSON: {exc}. Raw: {raw[:300]}")

    # Normalize string fields that Claude might return as objects
    for review in result.get("tweet_reviews", []):
        for field in ("issues",):
            items = review.get(field, [])
            review[field] = [str(i) if not isinstance(i, str) else i for i in items]

    return result
