import praw
from app.core.config import settings


def get_client():
    return praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent,
    )


def search_posts(query: str, subreddits: list[str] = None, limit: int = 25) -> list[dict]:
    if not settings.reddit_client_id:
        return []
    try:
        reddit = get_client()
        sub = "+".join(subreddits) if subreddits else "all"
        results = []
        for post in reddit.subreddit(sub).search(query, sort="hot", limit=limit):
            results.append({
                "id": post.id,
                "title": post.title,
                "selftext": post.selftext[:500],
                "score": post.score,
                "num_comments": post.num_comments,
                "subreddit": str(post.subreddit),
                "url": post.url,
                "created_utc": post.created_utc,
            })
        return results
    except Exception as e:
        return [{"error": str(e)}]


def get_hot_posts(subreddit: str, limit: int = 25) -> list[dict]:
    if not settings.reddit_client_id:
        return []
    try:
        reddit = get_client()
        results = []
        for post in reddit.subreddit(subreddit).hot(limit=limit):
            results.append({
                "id": post.id,
                "title": post.title,
                "score": post.score,
                "num_comments": post.num_comments,
                "url": post.url,
                "created_utc": post.created_utc,
            })
        return results
    except Exception as e:
        return [{"error": str(e)}]
