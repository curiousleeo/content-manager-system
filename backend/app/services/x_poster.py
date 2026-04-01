import tweepy
from app.core.config import settings


def post_tweet(text: str, project: dict | None = None) -> dict:
    """Post a tweet using project-level API keys if available, falling back to global env keys."""
    if project:
        api_key              = project.get("x_api_key") or settings.x_api_key
        api_secret           = project.get("x_api_secret") or settings.x_api_secret
        access_token         = project.get("x_access_token") or settings.x_access_token
        access_token_secret  = project.get("x_access_token_secret") or settings.x_access_token_secret
    else:
        api_key              = settings.x_api_key
        api_secret           = settings.x_api_secret
        access_token         = settings.x_access_token
        access_token_secret  = settings.x_access_token_secret

    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_token_secret,
    )
    response = client.create_tweet(text=text)
    return {
        "tweet_id": str(response.data["id"]),
        "text": response.data["text"],
    }
