"""
Platform compliance enforcement layer.

Runs silently on every piece of content — generation and review.
Users see only a pass/fail signal; the rulebook stays internal.

Sources:
  - X Terms of Service: https://twitter.com/en/tos
  - X Rules: https://help.twitter.com/en/rules-and-policies/twitter-rules
  - X Automation Rules: https://help.twitter.com/en/rules-and-policies/twitter-automation
  - X Developer Agreement: https://developer.twitter.com/en/developer-terms/agreement-and-policy
  - X Misleading Information Policy: https://help.twitter.com/en/rules-and-policies/manipulating-content
"""

# ── Hard violations ─────────────────────────────────────────────────────────
# Any of these = automatic block. Content cannot be posted.

HARD_VIOLATIONS = [
    # Identity & authenticity
    "Impersonating a real person, brand, or organization",
    "Creating the false impression that content comes from an official or verified source",
    "Coordinated inauthentic behavior — operating multiple accounts to amplify the same message",

    # Manipulation
    "Synthetic or manipulated media presented as real (deepfakes, AI-generated images of real people)",
    "Artificially inflating engagement (buying followers, fake retweets, coordinated likes)",
    "Posting the same content repeatedly across accounts or in rapid succession (spam)",

    # Harmful content
    "Threats of violence against any person or group",
    "Hateful conduct targeting race, ethnicity, national origin, gender, sexual orientation, religion, disability, or disease",
    "Content that sexualizes minors in any way",
    "Non-consensual intimate imagery",
    "Doxxing — sharing private personal information (address, phone, email, ID) without consent",

    # Misinformation
    "Election/voting misinformation — false claims about how, when, or where to vote",
    "Health misinformation — false medical claims, fake cures, anti-vaccine disinformation",
    "Financial manipulation — pump and dump schemes, false claims about stock/crypto to move price",
    "Crisis misinformation — false information during ongoing public emergencies",

    # Platform integrity
    "Illegal content under any applicable jurisdiction",
    "Affiliate or sponsored content without clear disclosure",
    "Links that disguise their true destination or redirect to malware",
]

# ── Soft violations ──────────────────────────────────────────────────────────
# These reduce quality score and generate warnings, but don't hard-block.

SOFT_VIOLATIONS = [
    "Engagement bait — 'RT to win', 'follow for follow', 'like if you agree' without proper context",
    "Excessive hashtags — more than 2 creates spam signals and reduces reach",
    "Mass-tagging accounts that are not relevant to the content",
    "Duplicate or near-duplicate content posted in the same 24-hour window",
    "Clickbait headlines that don't match the actual content",
    "Misleading framing — technically true but intentionally deceptive",
    "Excessive ALL CAPS or punctuation used for manipulative emphasis",
    "Scraping and republishing another creator's content without attribution",
]

# ── Automation-specific rules (applies when using API / scheduler) ───────────
# X requires automated posts to follow additional rules.

AUTOMATION_RULES = [
    "Automated accounts must not post at rates that simulate human behavior artificially",
    "Bot accounts must be labeled as automated in the profile if they tweet automatically",
    "Cannot use automation to trend topics artificially",
    "Must respect X rate limits — no retry loops that circumvent them",
    "Scheduled posts must contain original content, not scraped/republished material",
]

# ── Generation guardrails (injected into claude_service prompts) ─────────────
# Concise version of rules added to every generation prompt.

GENERATION_GUARDRAILS = """
Platform compliance rules — enforce strictly, no exceptions:
- No impersonation of real people, brands, or public figures
- No false or misleading claims presented as fact
- No hateful, threatening, or discriminatory content
- No spam patterns (excessive hashtags, mass tagging, engagement bait)
- No manipulation tactics (artificial urgency, fear-mongering, pump language)
- No undisclosed affiliate/sponsored content
- No content that could be used to coordinate inauthentic behavior
- All claims must be grounded in verifiable fact
- Maximum 2 hashtags, only if genuinely relevant
- No synthetic or AI-generated content presented as real human experience
"""

# ── Review checklist (injected into review prompts) ──────────────────────────
# Full checklist used in the review layer.

REVIEW_COMPLIANCE_CHECKLIST = """
Platform compliance checklist — flag any violation, even partial:

HARD VIOLATIONS (set passed=false, score 1-2, add to issues):
- Impersonation or false attribution to real people/brands
- Misinformation: health, elections, financial manipulation, crisis
- Hateful conduct, threats, or discrimination
- Doxxing or private information exposure
- Synthetic media presented as real
- Disguised spam (same content, mass tagging, fake engagement)
- Undisclosed paid promotion or affiliate content
- Engagement bait ("RT to win", "follow for follow")

SOFT VIOLATIONS (reduce score by 1-2 per violation, add to suggestions):
- More than 2 hashtags
- Clickbait or misleading framing
- Excessive ALL CAPS or punctuation
- Near-duplicate to commonly posted content
- Scraping or republishing another's content without clear attribution
- Content that could be mistaken for coordinated inauthentic behavior

AUTOMATION CONTEXT (if content is scheduled/automated):
- Must read as original, not templated
- Must not appear to be bulk-posted
"""


def get_generation_guardrails() -> str:
    """Return guardrails string to inject into generation prompts."""
    return GENERATION_GUARDRAILS


def get_review_checklist() -> str:
    """Return compliance checklist to inject into review prompts."""
    return REVIEW_COMPLIANCE_CHECKLIST


def hard_block_check(text: str) -> dict | None:
    """
    Fast pre-flight check before hitting the API.
    Catches obvious hard violations via pattern matching.
    Returns None if clean, or a block dict if violated.
    """
    text_lower = text.lower()

    # Hashtag spam check
    hashtag_count = text.count("#")
    if hashtag_count > 5:
        return {
            "blocked": True,
            "reason": "content_policy",
            "message": "Post contains too many hashtags. Maximum 2 allowed.",
        }

    # Extreme length check (X limit)
    if len(text) > 280:
        return {
            "blocked": True,
            "reason": "character_limit",
            "message": f"Post exceeds 280 characters ({len(text)} chars).",
        }

    # Obvious engagement bait patterns
    engagement_bait = [
        "rt to win", "retweet to win", "follow to win",
        "follow for follow", "f4f", "like for like",
        "rt if you", "retweet if you",
    ]
    for pattern in engagement_bait:
        if pattern in text_lower:
            return {
                "blocked": True,
                "reason": "engagement_bait",
                "message": "Post contains engagement bait tactics which violate platform rules.",
            }

    return None
