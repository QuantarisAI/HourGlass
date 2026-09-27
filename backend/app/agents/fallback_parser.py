"""Zero-dependency fallback intent parser, used only when GOOGLE_API_KEY is
not configured yet, so the app is usable immediately without a Gemini key.
Once you set GOOGLE_API_KEY, app/agents/task_agent.py's Gemini/ADK agent
takes over and understands free-form phrasing instead of these fixed patterns.

This is intentionally limited pattern matching, not NLU — it will not
understand arbitrary phrasing the way the real Gemini agent does.
"""

import re
from datetime import datetime

from dateutil import parser as date_parser
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.services import task_service

_UNIT_KWARGS = {
    "year": "years",
    "years": "years",
    "month": "months",
    "months": "months",
    "week": "weeks",
    "weeks": "weeks",
    "day": "days",
    "days": "days",
    "hour": "hours",
    "hours": "hours",
    "minute": "minutes",
    "minutes": "minutes",
}

_RELATIVE_RE = re.compile(
    r"(?:in\s+)?(?P<num>\d+)\s*(?P<unit>years?|months?|weeks?|days?|hours?|minutes?)\s*$",
    re.IGNORECASE,
)

# Greedy title match finds the LAST occurrence of the anchor keyword, so a
# title that happens to contain "by" (e.g. "competition by Google") doesn't
# get mistaken for the date split point. "by" is deliberately not an anchor
# here since it's too common a word in ordinary titles. Bare "timer" is
# deliberately not an anchor either (only "set timer") — otherwise a title
# ending in "...set" would wrongly split before "timer", leaking "set" into
# the title.
_ADD_RE = re.compile(
    r"^(?:add|create|new)\s+(?:a\s+|an\s+)?(?:task|challenge|card)?\s*(?:called\s+|named\s+)?"
    r"(?P<title>.+)\s+(?:due|deadline|set\s+timer(?:\s+for)?)\s+(?P<when>.+)$",
    re.IGNORECASE,
)
_COMPLETE_RE = re.compile(r"^(?:complete|done|finish(?:ed)?)\s+(?P<title>.+)$", re.IGNORECASE)
_DELETE_RE = re.compile(r"^(?:delete|remove|cancel)\s+(?P<title>.+)$", re.IGNORECASE)
_LIST_RE = re.compile(r"^(?:list|show)\s+(?:tasks|challenges|all)?$", re.IGNORECASE)


def _parse_when(text: str) -> datetime | None:
    text = text.strip()

    m = _RELATIVE_RE.search(text)
    if m:
        num = int(m.group("num"))
        unit = _UNIT_KWARGS[m.group("unit").lower()]
        return datetime.now().astimezone() + relativedelta(**{unit: num})

    try:
        parsed = date_parser.parse(text, fuzzy=True)
    except (ValueError, OverflowError):
        return None

    # Guard against dateutil's fuzzy mode mis-reading stray digits (e.g. from
    # unrelated words in the sentence) as a year far in the future/past.
    now = datetime.now()
    if not (now.year - 1 <= parsed.year <= now.year + 10):
        return None

    return parsed


def handle(db: Session, message: str) -> str:
    text = message.strip()

    m = _ADD_RE.match(text)
    if m:
        when = _parse_when(m.group("when"))
        if when is None:
            return (
                "I couldn't understand that deadline. Try: "
                "'add <title> due 30 September 6pm' or 'add <title> due in 40 days'. "
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
        "'add <title> due <date>' (or 'due in <N> days/weeks/months'), "
        "'complete <title>', 'delete <title>', 'list tasks'. "
        "Set GOOGLE_API_KEY in backend/.env for full natural-language chat via Gemini."
    )
