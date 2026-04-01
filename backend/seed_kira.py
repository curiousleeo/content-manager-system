"""
Run once after backend is up to seed the Kira project.
Usage: python seed_kira.py
"""

import requests

BASE = "http://localhost:8000"

kira = {
    "name": "Kira | GTR",
    "description": "BD & Partnerships account for GTR.TRADE — social-first trading on Hyperliquid",
    "tone": "Professional but warm. 70% professional, 30% casual crypto-native. Dry, subtle humour. Not corporate, not degen.",
    "style": "Short sentences. First person. Conversational DeFi fluency — doesn't over-explain. Occasional → emoji only. No chains of emojis. Max 2 hashtags and only on launch tweets, never in DMs.",
    "avoid": "Hype language (LFG, moon, HUGE, revolutionary). Corporate announcements ('we are pleased to...'). Chains of emojis. Hashtags in DMs. Engagement bait. ALL CAPS for emphasis. Buzzwords without substance.",
    "target_audience": "Protocol teams, DeFi builders, KOLs, and crypto-native traders in the Hyperliquid ecosystem. Ex-TradFi people who moved into DeFi. Operators, not speculators.",
    "content_pillars": [
        "social trading on Hyperliquid",
        "DeFi infrastructure",
        "derivatives and perps",
        "trading psychology",
        "GTR platform features",
        "crypto x traditional finance crossover"
    ],
    "default_subreddits": [],
    "posting_days": ["mon", "tue", "wed", "thu", "fri"],
    "posting_times": ["09:00", "17:00"]
}

res = requests.post(f"{BASE}/api/projects", json=kira)

if res.status_code == 200:
    data = res.json()
    print(f"✓ Kira project created — ID: {data.get('project', {}).get('id')}")
else:
    print(f"✗ Failed: {res.status_code} — {res.text}")
