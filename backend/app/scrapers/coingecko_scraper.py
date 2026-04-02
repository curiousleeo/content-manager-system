"""
CoinGecko trending scraper — free, no API key required.
Hits /api/v3/search/trending and returns top trending coins with metadata.
"""
import logging
import httpx

log = logging.getLogger(__name__)

COINGECKO_URL = "https://api.coingecko.com/api/v3/search/trending"


def get_trending_coins() -> list[dict]:
    """
    Returns list of trending coins from CoinGecko.
    Each item: { name, symbol, market_cap_rank, price_btc }
    Falls back to [] on any error.
    """
    try:
        resp = httpx.get(COINGECKO_URL, timeout=10, headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        coins = []
        for item in data.get("coins", []):
            coin = item.get("item", {})
            coins.append({
                "name":            coin.get("name", ""),
                "symbol":          coin.get("symbol", ""),
                "market_cap_rank": coin.get("market_cap_rank"),
                "price_btc":       coin.get("price_btc"),
                "thumb":           coin.get("thumb", ""),
            })
        return coins
    except Exception as e:
        log.warning("CoinGecko trending failed: %s", e)
        return []
