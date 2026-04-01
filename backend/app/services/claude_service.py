import re
import json
import anthropic
from app.core.config import settings
from app.services.platform_compliance import get_generation_guardrails, get_review_checklist

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
MODEL_FAST = "claude-haiku-4-5-20251001"   # analysis
MODEL_SMART = "claude-sonnet-4-6"          # generation + review


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


def generate_content(topic: str, insights: dict, platform: str = "x", project: dict | None = None) -> str:
    """Layer 3 — generate content based on insights."""
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
{get_generation_guardrails()}

Return only the post text, nothing else."""

    response = client.messages.create(
        model=MODEL_SMART,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def review_content(content: str, platform: str = "x", project: dict | None = None) -> dict:
    """Layer 4 — review content against checklist."""
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
