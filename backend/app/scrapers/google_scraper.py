from app.core.config import settings


def search_youtube(query: str, max_results: int = 10) -> list[dict]:
    if not settings.google_api_key:
        return []
    try:
        from googleapiclient.discovery import build
        youtube = build("youtube", "v3", developerKey=settings.google_api_key)
        response = youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            order="viewCount",
            maxResults=max_results,
            relevanceLanguage="en",
        ).execute()
        return [
            {
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"][:300],
                "channel": item["snippet"]["channelTitle"],
                "published_at": item["snippet"]["publishedAt"],
            }
            for item in response.get("items", [])
        ]
    except Exception as e:
        return [{"error": str(e)}]


def google_trends_related(query: str) -> list[str]:
    try:
        from pytrends.request import TrendReq
        pt = TrendReq(hl="en-US", tz=360)
        pt.build_payload([query], timeframe="now 7-d")
        related = pt.related_queries()
        top = related.get(query, {}).get("top")
        if top is not None:
            return top["query"].tolist()[:10]
    except Exception:
        pass
    return []
