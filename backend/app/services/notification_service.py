"""Free mobile push via ntfy.sh (https://ntfy.sh) — no signup, no API key.

Set NTFY_TOPIC in backend/.env to a unique, hard-to-guess topic name, then
install the ntfy app (Android/iOS) and subscribe to that same topic name.
Swap this out for Firebase Cloud Messaging or Telegram later by implementing
the same `send` signature.
"""

import httpx

from app.core.config import get_settings

settings = get_settings()


def send(title: str, message: str, priority: str = "default") -> bool:
    if not settings.ntfy_topic:
        return False
    try:
        httpx.post(
            f"https://ntfy.sh/{settings.ntfy_topic}",
            data=message.encode("utf-8"),
            headers={"Title": title, "Priority": priority},
            timeout=5.0,
        )
        return True
    except httpx.HTTPError:
        return False
