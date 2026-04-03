from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/cms"

    # X (Twitter)
    x_api_key: str = ""
    x_api_secret: str = ""
    x_access_token: str = ""
    x_access_token_secret: str = ""
    x_bearer_token: str = ""

    # Reddit
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "ContentManagerSystem/0.1"

    # Google / YouTube
    google_api_key: str = ""

    # Claude
    anthropic_api_key: str = ""

    # xAI / Grok
    xai_api_key: str = ""

    # CORS — comma-separated list of allowed origins
    allowed_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
