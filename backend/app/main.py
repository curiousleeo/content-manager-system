from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import research, insights, content, review, scheduler, projects
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Content Manager System", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.get("/health")
def health():
    return {"status": "ok"}
