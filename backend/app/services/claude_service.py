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


def _brand_context(project: dict | None, brand_brain: dict | None) -> str:
    """
    Build a rich brand context block for the generation prompt.
    Brand brain takes priority — project fields fill in any gaps.
    """
    parts = []

    if brand_brain:
        if brand_brain.get("mission"):
            parts.append(f"Mission: {brand_brain['mission']}")

        if brand_brain.get("core_beliefs"):
            beliefs = "\n".join(f"  - {b}" for b in brand_brain["core_beliefs"])
            parts.append(f"What this brand believes (write from this POV):\n{beliefs}")

        if brand_brain.get("hard_nos"):
            nos = "\n".join(f"  - {n}" for n in brand_brain["hard_nos"])
            parts.append(f"NEVER say, imply, or reference any of these:\n{nos}")

        if brand_brain.get("topic_angles"):
            angles = "\n".join(f"  - When topic is '{t}': {a}" for t, a in brand_brain["topic_angles"].items())
            parts.append(f"Topic angles to use:\n{angles}")

        if brand_brain.get("competitor_gap"):
            parts.append(f"What competitors do that we don't (use this to differentiate): {brand_brain['competitor_gap']}")

        if brand_brain.get("voice_examples"):
            examples = "\n".join(f"  - \"{e}\"" for e in brand_brain["voice_examples"][:3])
            parts.append(f"Voice examples — match this exact tone and style:\n{examples}")

    # Fall back to basic project fields if brain is empty or missing
    if not parts and project:
        if project.get("tone"):
            parts.append(f"Tone: {project['tone']}")
        if project.get("style"):
            parts.append(f"Style: {project['style']}")
        if project.get("avoid"):
            parts.append(f"Never use: {project['avoid']}")
        if project.get("target_audience"):
            parts.append(f"Target audience: {project['target_audience']}")
    elif project:
        # Even when brain exists, always append basic avoid/audience if set
        if project.get("avoid"):
            parts.append(f"Also never use: {project['avoid']}")
        if project.get("target_audience"):
            parts.append(f"Target audience: {project['target_audience']}")

    if not parts:
        return ""
    return "\n\nBrand context — follow this strictly, it defines every word you write:\n" + "\n\n".join(parts)


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


def _niche_context(example_bank: dict | None) -> str:
    """
    Format the example bank as prompt context.
    Passes real tweet text + engagement + hook type so Claude can actually
    transfer style — not just follow a label like 'question hook'.
    """
    if not example_bank or not example_bank.get("has_data"):
        return ""

    parts = []

    if example_bank.get("dominant_tone"):
        parts.append(f"Dominant tone in this niche: {example_bank['dominant_tone']}")

    # Swipe file — Claude-curated, richest signal
    swipe = [e for e in example_bank.get("swipe_file", []) if e.get("text")][:8]
    if swipe:
        lines = []
        for e in swipe:
            hook = f" [{e['hook_type']}]" if e.get("hook_type") else ""
            engagement = f"{e['likes']} likes" if e.get("likes") else ""
            why = f"\n   Why it works: {e['why']}" if e.get("why") else ""
            header = f"@{e['handle']}{hook}" + (f" — {engagement}" if engagement else "")
            lines.append(f"{header}\n   \"{e['text'][:280]}\"{why}")
        parts.append(
            "High-engagement posts from COMPETITOR accounts — these are not our posts and not our features.\n"
            "Study ONLY the style, hook structure, and sentence rhythm. "
            "DO NOT copy their content. "
            "DO NOT adopt their product claims, feature announcements, or platform specifics. "
            "Write original GTR Trade content that uses the same energy:\n\n"
            + "\n\n".join(lines)
        )

    # Fall back to raw top tweets if no swipe file
    elif example_bank.get("top_tweets"):
        top = [t for t in example_bank["top_tweets"] if t.get("text")][:5]
        lines = []
        for t in top:
            engagement = f"{t['likes']} likes" if t.get("likes") else ""
            header = f"@{t['handle']}" + (f" — {engagement}" if engagement else "")
            lines.append(f"{header}\n   \"{t['text'][:280]}\"")
        parts.append(
            "Top posts from COMPETITOR accounts — style reference only.\n"
            "Do NOT treat their features, announcements, or platform claims as things we offer or can say:\n\n"
            + "\n\n".join(lines)
        )

    # Hook patterns that have real examples attached
    hooks = [h for h in example_bank.get("hook_patterns", []) if h.get("example")][:3]
    if hooks:
        hook_lines = "\n".join(
            f"   - {h['type']}: \"{h['example'][:120]}\""
            for h in hooks
        )
        parts.append(f"Hook patterns that work in this niche:\n{hook_lines}")

    # Our own posts that proved to work — strongest signal for voice + style
    own_posts = [p for p in example_bank.get("own_top_posts", []) if p.get("text")][:3]
    if own_posts:
        lines = []
        for p in own_posts:
            engagement = f"{p['likes']} likes" if p.get("likes") else ""
            header = "Our post" + (f" ({p['topic']})" if p.get("topic") else "") + (f" — {engagement}" if engagement else "")
            lines.append(f"{header}\n   \"{p['text'][:280]}\"")
        parts.insert(0,
            "Our own posts that got real engagement — this is the voice and style that works for our audience:\n\n"
            + "\n\n".join(lines)
        )

    if not parts:
        return ""
    return "\n\nContent intelligence — what's working in this niche and in our own feed:\n\n" + "\n\n".join(parts)


def generate_content(topic: str, insights: dict, platform: str = "x", project: dict | None = None, example_bank: dict | None = None, brand_brain: dict | None = None) -> str:
    """Layer 3 — generate content based on insights."""
    _check_pause()
    platform_rules = {
        "x": "Twitter/X post. Max 280 characters. No hashtag spam (max 1-2 if relevant). Direct, punchy, no fluff.",
    }

    prompt = f"""You are a content writer for GTR Trade — a self-custodial multi-asset trading platform.
Write a {platform_rules.get(platform, platform)} post about: {topic}

Use these insights to make it relevant:
{insights}

Content rules:
- Sound like a real person, not a brand or AI
- No corporate language
- No hype words (amazing, incredible, revolutionary)
- Get to the point immediately
- Write in first person where it makes sense
- CRITICAL: You are writing for GTR Trade. Never attribute features or announcements from other platforms (Hyperliquid, Drift, Binance, dYdX, etc.) to GTR Trade
- CRITICAL: Only write about things GTR Trade actually does — multi-asset self-custodial trading, crypto perps, RWA perps, tokenized stocks, forex-style markets
{_brand_context(project, brand_brain)}
{_niche_context(example_bank)}
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
    example_bank: dict | None = None,
    brand_brain: dict | None = None,
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

    prompt = f"""You are a content writer for GTR Trade — a self-custodial multi-asset trading platform.
Generate a batch of {count} {platform_rules.get(platform, platform)} posts.

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
- CRITICAL: You are writing for GTR Trade. Never attribute features or announcements from other platforms (Hyperliquid, Drift, Binance, dYdX, etc.) to GTR Trade
- CRITICAL: Only write about things GTR Trade actually does — multi-asset self-custodial trading, crypto perps, RWA perps, tokenized stocks, forex-style markets
{_brand_context(project, brand_brain)}
{_niche_context(example_bank)}
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
