import tweepy
from app.core.config import settings


def post_tweet(text: str) -> dict:
    client = tweepy.Client(
        consumer_key=settings.x_api_key,
        consumer_secret=settings.x_api_secret,
        access_token=settings.x_access_token,
        access_token_secret=settings.x_access_token_secret,
    )
    response = client.create_tweet(text=text)
    return {
        "tweet_id": str(response.data["id"]),
        "text": response.data["text"],
    }
