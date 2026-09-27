"""Zero-dependency fallback intent parser, used only when GOOGLE_API_KEY is
not configured yet, so the app is usable immediately without a Gemini key.
Once you set GOOGLE_API_KEY, app/agents/task_agent.py's Gemini/ADK agent
takes over and understands free-form phrasing instead of these fixed patterns.
"""

import re

from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from app.services import task_service

_ADD_RE = re.compile(
    r"^(?:add|create|new)\s+(?:a\s+|an\s+)?(?:task|challenge|card)?\s*(?:called\s+|named\s+)?"
    r"(?P<title>.+?)\s+(?:due|by|deadline)\s+(?P<when>.+)$",
    re.IGNORECASE,
)
_COMPLETE_RE = re.compile(r"^(?:complete|done|finish(?:ed)?)\s+(?P<title>.+)$", re.IGNORECASE)
_DELETE_RE = re.compile(r"^(?:delete|remove|cancel)\s+(?P<title>.+)$", re.IGNORECASE)
_LIST_RE = re.compile(r"^(?:list|show)\s+(?:tasks|challenges|all)?$", re.IGNORECASE)


def handle(db: Session, message: str) -> str:
    text = message.strip()

    m = _ADD_RE.match(text)
    if m:
        try:
            when = date_parser.parse(m.group("when"), fuzzy=True)
        except (ValueError, OverflowError):
            return (
                "I couldn't understand that deadline. Try: "
                "'add <title> due 30 September 6pm'. "
                "(Tip: set GOOGLE_API_KEY for full natural-language understanding.)"
            )
        task = task_service.create_task(db, title=m.group("title").strip(), deadline=when)
        return f"Added \"{task.title}\", due {task.deadline.isoformat()}."

    m = _COMPLETE_RE.match(text)
    if m:
        task = task_service.find_task_by_title(db, m.group("title").strip())
        if not task:
            return f"No task matching \"{m.group('title')}\" found."
        task_service.complete_task(db, task)
        return f"Marked \"{task.title}\" as completed."

    m = _DELETE_RE.match(text)
    if m:
        task = task_service.find_task_by_title(db, m.group("title").strip())
        if not task:
            return f"No task matching \"{m.group('title')}\" found."
        title = task.title
        task_service.delete_task(db, task)
        return f"Deleted \"{title}\"."

    if _LIST_RE.match(text):
        tasks = task_service.list_tasks(db)
        if not tasks:
            return "You have no tasks yet."
        lines = [f"- {t.title} (due {t.deadline.isoformat()})" for t in tasks]
        return "Your tasks:\n" + "\n".join(lines)

    return (
        "I only understand simple commands right now: "
        "'add <title> due <date>', 'complete <title>', 'delete <title>', 'list tasks'. "
        "Set GOOGLE_API_KEY in backend/.env for full natural-language chat via Gemini."
    )
