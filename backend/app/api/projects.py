import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.content import Project

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tone: Optional[str] = None
    style: Optional[str] = None
    avoid: Optional[str] = None
    target_audience: Optional[str] = None
    content_pillars: Optional[list[str]] = None
    default_platform: Optional[str] = "x"
    posting_days: Optional[list[str]] = None
    posting_times: Optional[list[str]] = None
    coingecko_enabled: Optional[bool] = False
    telegram_channels: Optional[list[str]] = None
    x_api_key: Optional[str] = None
    x_api_secret: Optional[str] = None
    x_access_token: Optional[str] = None
    x_access_token_secret: Optional[str] = None
    x_bearer_token: Optional[str] = None
    personal_x_handle: Optional[str] = None
    personal_x_user_id: Optional[str] = None
    audit_auto_fetch: Optional[bool] = None


class ProjectUpdate(ProjectCreate):
    name: Optional[str] = None


def serialize(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "tone": p.tone,
        "style": p.style,
        "avoid": p.avoid,
        "target_audience": p.target_audience,
        "content_pillars":    p.content_pillars or [],
        "default_platform":   p.default_platform,
        "posting_days":       p.posting_days or [],
        "posting_times":      p.posting_times or [],
        "coingecko_enabled":  bool(p.coingecko_enabled),
        "telegram_channels":  p.telegram_channels or [],
        "timezone":           p.timezone or "UTC",
        "x_api_key":           p.x_api_key or "",
        "x_api_secret":        p.x_api_secret or "",
        "x_access_token":      p.x_access_token or "",
        "x_access_token_secret": p.x_access_token_secret or "",
        "x_bearer_token":      p.x_bearer_token or "",
        "personal_x_handle":   p.personal_x_handle or "",
        "personal_x_user_id":  p.personal_x_user_id or "",
        "audit_auto_fetch":    bool(p.audit_auto_fetch),
        "created_at":         p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return {"projects": [serialize(p) for p in projects]}


@router.post("/")
def create_project(req: ProjectCreate, db: Session = Depends(get_db)):
    try:
        project = Project(**req.model_dump())
        db.add(project)
        db.commit()
        db.refresh(project)
        return serialize(project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error creating project: {e}")


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize(project)


@router.patch("/{project_id}")
def update_project(project_id: int, req: ProjectUpdate, db: Session = Depends(get_db)):
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        for field, value in req.model_dump(exclude_none=True).items():
            setattr(project, field, value)
        db.commit()
        db.refresh(project)
        return serialize(project)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error saving project: {e}")


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        db.delete(project)
        db.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error deleting project: {e}")
