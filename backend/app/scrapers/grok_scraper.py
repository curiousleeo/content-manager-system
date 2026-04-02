"""
Grok scraper — uses xAI's Grok API to pull real-time X conversation data.
Uses httpx (no extra dependencies) to call xAI's OpenAI-compatible REST API.
"""
import re
import json
import httpx
from app.core.config import settings

XAI_BASE = "https://api.x.ai/v1/chat/completions"


def _call_grok(system: str, user: str, max_tokens: int = 1500) -> str:
    """Make a raw HTTP call to xAI API. Returns response text."""
    if not settings.xai_api_key:
        raise ValueError("XAI_API_KEY not configured")

    resp = httpx.post(
        XAI_BASE,
        headers={
            "Authorization": f"Bearer {settings.xai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "grok-3",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _parse(text: str):
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text.strip())


def search_x_conversations(query: str, limit: int = 10) -> list[dict]:
    """Ask Grok what people on X are saying about a topic right now."""
    try:
        text = _call_grok(
            system="You are a research assistant with real-time X access. Return only valid JSON arrays.",
            user=f"""Search recent X (Twitter) conversations about: "{query}"

Return a JSON array of {limit} items. Each item must have:
- "text": the key point or tweet being discussed
- "sentiment": positive/neutral/negative
- "engagement": high/medium/low
- "angle": content angle this suggests

Focus on traders, builders, DeFi users. No promotional content.
Return ONLY a valid JSON array, no explanation, no markdown.""",
        )
        return _parse(text)
    except Exception as e:
        return [{"error": str(e)}]


def get_trending_topics(niche: str = "crypto trading") -> list[str]:
    """Ask Grok what's trending on X right now in a given niche."""
    try:
        text = _call_grok(
            system="You have real-time X access. Return only valid JSON arrays.",
            user=f"""Top 10 trending topics on X right now in the {niche} space.
Return ONLY a JSON array of strings. Example: ["Hyperliquid volume ATH", "BTC ETF flows"]
No explanation, no markdown.""",
            max_tokens=400,
        )
        return _parse(text)
    except Exception as e:
        return []
