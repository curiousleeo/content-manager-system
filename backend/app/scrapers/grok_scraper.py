"""
Grok scraper — uses xAI's Grok API to pull real-time X conversation data.
Grok has live X access, so this replaces the paid X read API for research.

Rate limits enforced here:
  - Max 5 calls per research run (enforced by caller)
  - Daily cap tracked via api_usage table (service: grok_calls)
  - Monthly soft limit: 200 calls (~$0.10-0.30 at current pricing)
"""
from openai import OpenAI
from app.core.config import settings

# xAI uses OpenAI-compatible API
_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.xai_api_key,
            base_url="https://api.x.ai/v1",
        )
    return _client


def search_x_conversations(query: str, limit: int = 10) -> list[dict]:
    """
    Ask Grok what people on X are saying about a topic right now.
    Returns structured list of conversation insights.
    """
    if not settings.xai_api_key:
        return [{"error": "XAI_API_KEY not configured"}]

    prompt = f"""You have real-time access to X (Twitter). Search for recent conversations about: "{query}"

Return a JSON array of the {limit} most relevant/recent posts or discussion points. Each item must have:
- "text": the tweet text or key point being discussed
- "sentiment": positive/neutral/negative
- "engagement": estimated engagement level (high/medium/low)
- "angle": what content angle this suggests

Focus on:
- What traders, builders, and DeFi users are actually saying
- Genuine opinions, not promotional content
- Emerging narratives or debates
- Pain points being discussed

Return ONLY a valid JSON array, no explanation, no markdown."""

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="grok-3",
            messages=[
                {
                    "role": "system",
                    "content": "You are a research assistant with real-time X access. Return only valid JSON arrays as instructed."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
        )
        import json, re
        text = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text.strip())
    except Exception as e:
        return [{"error": str(e)}]


def get_trending_topics(niche: str = "crypto trading") -> list[str]:
    """
    Ask Grok what's trending on X right now in a given niche.
    Returns a list of trending topic strings.
    """
    if not settings.xai_api_key:
        return []

    prompt = f"""What are the top 10 trending topics on X (Twitter) right now in the {niche} space?

Return ONLY a JSON array of strings — topic names or short phrases.
Example: ["Hyperliquid volume ATH", "Bitcoin ETF flows", "DeFi TVL recovery"]

No explanation, no markdown, just the JSON array."""

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="grok-3",
            messages=[
                {
                    "role": "system",
                    "content": "You have real-time X access. Return only valid JSON arrays."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
        )
        import json, re
        text = response.choices[0].message.content.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text.strip())
    except Exception as e:
        return []
