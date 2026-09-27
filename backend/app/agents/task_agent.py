"""Google ADK agent wiring. This is the "brain" behind /api/chat: a Gemini
model with typed tool functions ("skills") for CRUD on tasks, plus any
uploaded skills from app/agents/skill_loader.py.

Requires GOOGLE_API_KEY to be set (see backend/.env.example); until then
app/api/routes/chat.py falls back to app/agents/fallback_parser.py so the
app is usable out of the box.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.agents.skill_loader import load_uploaded_skills
from app.core.config import get_settings
from app.services import task_service

settings = get_settings()

APP_NAME = "hourglass"

_session_service = None


def _get_session_service():
    global _session_service
    if _session_service is None:
        from google.adk.sessions import InMemorySessionService

        _session_service = InMemorySessionService()
    return _session_service


def _make_tools(db: Session) -> list[Any]:
    def create_task(title: str, deadline_iso: str, description: str = "") -> dict:
        """Create a new tracked task/challenge.

        Args:
            title: short name of the task.
            deadline_iso: ISO-8601 datetime string for the deadline, e.g.
                2026-09-30T18:00:00. Resolve any relative/vague date
                ("next Friday", "30 Sept") to this exact format first.
            description: optional extra detail about the task.
        """
        deadline = datetime.fromisoformat(deadline_iso)
        task = task_service.create_task(
            db, title=title, deadline=deadline, description=description or None
        )
        return {"id": task.id, "title": task.title, "deadline": task.deadline.isoformat()}

    def list_tasks() -> dict:
        """List all tasks (active and completed) with deadlines, soonest first."""
        tasks = task_service.list_tasks(db)
        return {
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "deadline": t.deadline.isoformat(),
                    "status": t.status.value,
                }
                for t in tasks
            ]
        }

    def update_task_deadline(title_fragment: str, new_deadline_iso: str) -> dict:
        """Change the deadline of an existing task.

        Args:
            title_fragment: part of the task's title to search for.
            new_deadline_iso: new ISO-8601 deadline for that task.
        """
        task = task_service.find_task_by_title(db, title_fragment)
        if not task:
            return {"error": f"No task matching '{title_fragment}' found."}
        task_service.update_task(db, task, deadline=datetime.fromisoformat(new_deadline_iso))
        return {"id": task.id, "title": task.title, "deadline": task.deadline.isoformat()}

    def complete_task(title_fragment: str) -> dict:
        """Mark a task as completed.

        Args:
            title_fragment: part of the task's title to search for.
        """
        task = task_service.find_task_by_title(db, title_fragment)
        if not task:
            return {"error": f"No task matching '{title_fragment}' found."}
        task_service.complete_task(db, task)
        return {"id": task.id, "title": task.title, "status": "completed"}

    def delete_task(title_fragment: str) -> dict:
        """Permanently delete a task.

        Args:
            title_fragment: part of the task's title to search for.
        """
        task = task_service.find_task_by_title(db, title_fragment)
        if not task:
            return {"error": f"No task matching '{title_fragment}' found."}
        title = task.title
        task_service.delete_task(db, task)
        return {"deleted": True, "title": title}

    tools: list[Any] = [
        create_task,
        list_tasks,
        update_task_deadline,
        complete_task,
        delete_task,
    ]
    tools.extend(load_uploaded_skills())
    return tools


def _build_agent(db: Session):
    from google.adk.agents import Agent

    today = datetime.now().isoformat()
    return Agent(
        name="hourglass_agent",
        model=settings.gemini_model,
        instruction=(
            "You are HourGlass, a deadline-tracking productivity assistant. "
            f"The current date/time is {today}. The user manages tasks and "
            "challenges with deadlines entirely through chat with you — there "
            "is no other input method, so always take action via your tools "
            "rather than just describing what to do. Always resolve dates "
            "(including vague ones like 'next Friday' or '30 Sept') to a "
            "precise ISO-8601 datetime before calling a tool. After acting, "
            "reply in one or two short sentences confirming exactly what "
            "changed."
        ),
        tools=_make_tools(db),
    )


async def run_agent(db: Session, session_id: str, message: str) -> str:
    from google.genai import types

    from google.adk.runners import Runner

    agent = _build_agent(db)
    session_service = _get_session_service()
    runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)

    existing = await session_service.get_session(
        app_name=APP_NAME, user_id="default_user", session_id=session_id
    )
    if existing is None:
        await session_service.create_session(
            app_name=APP_NAME, user_id="default_user", session_id=session_id
        )

    content = types.Content(role="user", parts=[types.Part(text=message)])

    final_text_parts: list[str] = []
    async for event in runner.run_async(
        user_id="default_user", session_id=session_id, new_message=content
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text_parts = [p.text for p in event.content.parts if getattr(p, "text", None)]

    return " ".join(final_text_parts) if final_text_parts else "Done."
