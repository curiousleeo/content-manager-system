"""
Telegram public channel scraper.
Fetches t.me/s/{slug} (public web preview — no auth, no API key).
Parses post text via BeautifulSoup.
Falls back to [] silently on any error (blocked, private, CAPTCHA, etc.).
"""
import logging
import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

BASE = "https://t.me/s/{slug}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
    "Accept-Language": "en-US,en;q=0.9",
}


def scrape_channel(slug: str, limit: int = 20) -> list[dict]:
    """
    Scrape recent posts from a public Telegram channel.
    Returns list of { text, views } dicts.
    Falls back to [] on any failure.
    """
    url = BASE.format(slug=slug.strip().lstrip("@"))
    try:
        resp = httpx.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        if resp.status_code != 200:
            log.warning("Telegram scrape got %d for %s", resp.status_code, slug)
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        messages = soup.select(".tgme_widget_message_text")
        views_els = soup.select(".tgme_widget_message_views")

        results = []
        for i, msg in enumerate(messages[:limit]):
            text = msg.get_text(separator=" ", strip=True)
            if not text:
                continue
            views_text = views_els[i].get_text(strip=True) if i < len(views_els) else ""
            results.append({"text": text, "views": views_text, "channel": slug})

        return results
    except Exception as e:
        log.warning("Telegram scrape failed for %s: %s", slug, e)
        return []


def scrape_channels(slugs: list[str], limit_per_channel: int = 20) -> list[dict]:
    """Scrape multiple channels. Returns combined flat list."""
    results = []
    for slug in slugs:
        results.extend(scrape_channel(slug, limit=limit_per_channel))
    return results
