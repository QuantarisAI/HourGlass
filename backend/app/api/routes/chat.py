from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])
settings = get_settings()


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if settings.google_api_key:
        from app.agents.task_agent import run_agent

        reply = await run_agent(db, payload.session_id, payload.message)
    else:
        from app.agents.fallback_parser import handle

        reply = handle(db, payload.message)

    return ChatResponse(reply=reply, session_id=payload.session_id)
