from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import research, insights, content, review, scheduler, projects, notifications, niche, analytics, calendar
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from app.services.auto_poster import register_all_projects
    register_all_projects()
    yield


app = FastAPI(title="Content Manager System", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://content-manager-system.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(research.router, prefix="/api/research", tags=["research"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(review.router, prefix="/api/review", tags=["review"])
app.include_router(scheduler.router, prefix="/api/scheduler", tags=["scheduler"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(niche.router, prefix="/api/niche", tags=["niche"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])


@app.get("/health")
def health():
    return {"status": "ok"}
