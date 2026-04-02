import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.content import Project, ContentDraft, ContentStatus
from app.services.claude_service import review_content
from app.services.platform_compliance import hard_block_check
from app.services.usage_tracker import record_usage

router = APIRouter()


class ReviewRequest(BaseModel):
    text: str
    platform: str = "x"
    project_id: Optional[int] = None
    draft_id: Optional[int] = None  # If set, review notes are written to this draft


@router.post("/check")
def review(req: ReviewRequest, db: Session = Depends(get_db)):
    block = hard_block_check(req.text)
    if block:
        result = {
            "passed": False,
            "score": 1,
            "issues": [block["message"]],
            "suggestions": ["Remove the violating content and rewrite the post."],
            "ai_likelihood": "unknown",
        }
        return {"review": result, "draft_id": None}

    project = None
    if req.project_id:
        p = db.query(Project).filter(Project.id == req.project_id).first()
        if p:
            project = {"tone": p.tone, "style": p.style, "avoid": p.avoid, "target_audience": p.target_audience}

    result = review_content(req.text, req.platform, project=project)
    record_usage(db, "claude_calls", project_id=req.project_id)

    review_json = json.dumps(result)
    draft_id = req.draft_id

    if draft_id:
        # Write review notes to existing draft
        draft = db.query(ContentDraft).filter(ContentDraft.id == draft_id).first()
        if draft:
            draft.review_notes = review_json
            if result.get("passed"):
                draft.status = ContentStatus.reviewed
            db.commit()
    else:
        # No existing draft — create a placeholder draft to hold the review
        # so it's not lost when the user proceeds to schedule/post
        draft = ContentDraft(
            project_id=req.project_id,
            topic="reviewed",
            platform="x",
            body=req.text,
            status=ContentStatus.reviewed,
            review_notes=review_json,
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        draft_id = draft.id

    return {"review": result, "draft_id": draft_id}
