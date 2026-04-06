import re
import json
import anthropic
from app.core.config import settings
from app.services.platform_compliance import get_generation_guardrails, get_review_checklist

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL_FAST = "claude-haiku-4-5-20251001"   # analysis
MODEL_SMART = "claude-sonnet-4-6"          # generation + review


def _check_pause():
    if settings.pause_external_apis:
        raise RuntimeError("External API calls are paused. Set PAUSE_EXTERNAL_APIS=false to resume.")


def _parse_json(text: str) -> dict:
    """Parse JSON from Claude response, stripping markdown code fences if present."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text.strip())


def _project_context(project: dict | None) -> str:
    if not project:
        return ""
    parts = []
    if project.get("tone"):
        parts.append(f"Tone: {project['tone']}")
    if project.get("style"):
        parts.append(f"Style: {project['style']}")
    if project.get("avoid"):
        parts.append(f"Never use: {project['avoid']}")
    if project.get("target_audience"):
        parts.append(f"Target audience: {project['target_audience']}")
    if not parts:
        return ""
    return "\n\nProject settings to follow strictly:\n" + "\n".join(f"- {p}" for p in parts)


def analyze_insights(raw_data: dict, project: dict | None = None) -> dict:
    """Layer 2 — analyze scraped data and return structured insights."""
    _check_pause()
    prompt = f"""You are a content strategist analyzing social media and search data.

Analyze the following research data and return a JSON object with:
- trending_topics: list of topics currently getting traction
- dying_trends: list of topics losing momentum
- emerging_topics: list of topics about to trend
- key_themes: main themes people are discussing
- sentiment: overall sentiment (positive/neutral/negative)
- best_angles: list of content angles that would resonate
{_project_context(project)}

Research data:
{raw_data}

Return only valid JSON, no explanation."""

    response = client.messages.create(
        model=MODEL_FAST,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_json(response.content[0].text)


def _niche_context(niche_report: dict | None) -> str:
    """Format the latest niche intelligence report as prompt context."""
    if not niche_report:
        return ""
    parts = []
    if niche_report.get("dominant_tone"):
        parts.append(f"Dominant tone in this niche: {niche_report['dominant_tone']}")
    if niche_report.get("hook_patterns"):
        top_hooks = [h["type"] for h in niche_report["hook_patterns"][:3] if h.get("type")]
        if top_hooks:
            parts.append(f"Top-performing hook types in this niche: {', '.join(top_hooks)}")
    if niche_report.get("swipe_file"):
        examples = niche_report["swipe_file"][:2]
        if examples:
            ex_text = "\n".join(f'  - "{e.get("text", "")[:120]}"' for e in examples if e.get("text"))
            parts.append(f"Example high-performing posts to draw inspiration from (DO NOT copy):\n{ex_text}")
    if not parts:
        return ""
    return "\n\nNiche intelligence (patterns from top accounts in this space):\n" + "\n".join(f"- {p}" for p in parts)


def generate_content(topic: str, insights: dict, platform: str = "x", project: dict | None = None, niche_report: dict | None = None) -> str:
    """Layer 3 — generate content based on insights."""
    _check_pause()
    platform_rules = {
        "x": "Twitter/X post. Max 280 characters. No hashtag spam (max 1-2 if relevant). Direct, punchy, no fluff.",
    }

    prompt = f"""You are a content writer. Write a {platform_rules.get(platform, platform)} post about: {topic}

Use these insights to make it relevant:
{insights}

Content rules:
- Sound like a real person, not a brand or AI
- No corporate language
- No hype words (amazing, incredible, revolutionary)
- Get to the point immediately
- Write in first person where it makes sense
{_project_context(project)}
{_niche_context(niche_report)}
{get_generation_guardrails()}

Return only the post text, nothing else."""

    response = client.messages.create(
        model=MODEL_SMART,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def batch_generate_content(
    pillars: list[str],
    insights: dict,
    platform: str = "x",
    project: dict | None = None,
    niche_report: dict | None = None,
    count: int = 15,
) -> list[dict]:
    """
    Generate `count` posts distributed across `pillars` in a single Claude call.
    Returns list of {pillar, text} dicts.
    """
    _check_pause()
    platform_rules = {
        "x": "Twitter/X post. Max 280 characters. No hashtag spam (max 1-2 if relevant). Direct, punchy.",
    }
    # Distribute count across pillars evenly
    per_pillar = max(1, count // len(pillars))
    remainder = count - per_pillar * len(pillars)
    distribution = []
    for i, pillar in enumerate(pillars):
        n = per_pillar + (1 if i < remainder else 0)
        distribution.append(f"- {pillar}: {n} posts")

    prompt = f"""You are a content writer. Generate a batch of {count} {platform_rules.get(platform, platform)} posts.

Distribution across content pillars:
{chr(10).join(distribution)}

Use these insights to make posts relevant:
{insights}

Rules for every post:
- Sound like a real person, not a brand or AI
- No corporate language or hype words
- Get to the point immediately
- Write in first person where it makes sense
- Each post must be different — vary hooks, angles, and structure
{_project_context(project)}
{_niche_context(niche_report)}
{get_generation_guardrails()}

Return ONLY a valid JSON array. Each item must have:
- "pillar": the content pillar this post belongs to
- "text": the post content

Example format:
[{{"pillar": "crypto perps", "text": "post text here"}}, ...]

Return the JSON array only, no explanation."""

    response = client.messages.create(
        model=MODEL_SMART,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        return _parse_json(response.content[0].text)
    except Exception:
        # Fallback: return what we can parse
        return []


def review_content(content: str, platform: str = "x", project: dict | None = None) -> dict:
    """Layer 4 — review content against checklist."""
    _check_pause()
    avoid_note = ""
    if project and project.get("avoid"):
        avoid_note = f"\n- Does not use any of these (project rule): {project['avoid']}"

    prompt = f"""Review this {platform} post and return a JSON object with:
- passed: boolean (true if it passes ALL checks — both quality and compliance)
- score: 1-10
- issues: list of specific problems found (quality OR compliance)
- suggestions: list of specific improvements
- ai_likelihood: low/medium/high (how AI-generated does it sound)

Quality checklist:
1. Does not sound AI-generated
2. No corporate buzzwords
3. No excessive punctuation or emojis
4. Makes a clear point
5. Appropriate length for platform
6. Not clickbait
7. Factually grounded (no wild claims){avoid_note}

{get_review_checklist()}

Post to review:
{content}

Return only valid JSON."""

    response = client.messages.create(
        model=MODEL_SMART,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_json(response.content[0].text)
