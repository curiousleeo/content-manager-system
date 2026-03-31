import tweepy
from app.core.config import settings


def get_client():
    return tweepy.Client(
        bearer_token=settings.x_bearer_token,
        consumer_key=settings.x_api_key,
        consumer_secret=settings.x_api_secret,
        access_token=settings.x_access_token,
        access_token_secret=settings.x_access_token_secret,
        wait_on_rate_limit=True,  # auto-wait instead of crashing
    )


def search_recent(query: str, max_results: int = 50) -> list[dict]:
    if not settings.x_bearer_token:
        return []
    try:
        client = get_client()
        response = client.search_recent_tweets(
            query=f"{query} -is:retweet lang:en",
            max_results=min(max_results, 100),
            tweet_fields=["public_metrics", "created_at", "author_id"],
        )
        if not response.data:
            return []
        return [
            {
                "id": str(t.id),
                "text": t.text,
                "metrics": t.public_metrics,
                "created_at": str(t.created_at),
            }
            for t in response.data
        ]
    except tweepy.TooManyRequests:
        return [{"error": "X API rate limit hit — try again in 15 minutes"}]
    except tweepy.Unauthorized:
        return [{"error": "X API credentials invalid"}]
    except Exception as e:
        return [{"error": str(e)}]


def get_trending(woeid: int = 1) -> list[dict]:
    if not settings.x_api_key:
        return []
    try:
        auth = tweepy.OAuth1UserHandler(
            settings.x_api_key,
            settings.x_api_secret,
            settings.x_access_token,
            settings.x_access_token_secret,
        )
        api = tweepy.API(auth, wait_on_rate_limit=True)
        trends = api.get_place_trends(woeid)
        return [
            {"name": t["name"], "tweet_volume": t["tweet_volume"]}
            for t in trends[0]["trends"]
            if t["tweet_volume"]
        ]
    except Exception as e:
        return [{"error": str(e)}]
