# HourGlass

A chat-driven deadline / productivity tracker. You talk (type or speak) to an
agentic assistant ("add a challenge due 30 Sept", "mark X done", "push Y by 2
days") and it creates/updates cards on a dashboard. Cards are always sorted
with the nearest deadline first, show a live countdown (down to milliseconds),
turn from calm to urgent colors as the deadline approaches, and fire free
browser push notifications at configurable checkpoints.

## Architecture

```
HourGlass/
  frontend/   Next.js 15 (App Router, TS, Tailwind) — dashboard, chat/voice dock, browser notifications
  backend/    FastAPI + Google ADK agent ("HourGlassAgent") — NLU, task CRUD, skills, persistence
```

Enterprise-style layering:

- `backend/app/api/routes` — HTTP boundary (FastAPI routers)
- `backend/app/agents` — Google ADK agent + tool ("skill") registry
- `backend/app/services` — business logic (task lifecycle, notifications)
- `backend/app/db` — SQLAlchemy models + session (SQLite today, Cloud SQL Postgres later — same code path)
- `backend/app/schemas` — Pydantic I/O contracts
- `frontend/app` — routes/pages
- `frontend/components` — presentational + client components
- `frontend/hooks`, `frontend/lib` — countdown logic, API client, shared types

## Why the input is chat-only

There is no "new task" form. Every mutation — create, edit deadline, mark
done, delete — goes through `POST /api/chat`, which hands your message to a
Gemini-backed Google ADK agent. The agent has "skills" (typed tool functions)
for `create_task`, `update_task`, `complete_task`, `delete_task`, `list_tasks`.
It replies with what it understood *and* what it changed, then the frontend
refetches the task list.

Voice input uses the browser's built-in Web Speech API (free, no key) purely
for speech→text; the resulting text goes through the exact same Gemini agent
path as typed text, per your ask to use Gemini for understanding+action.

## Countdown & prioritization

- `frontend/hooks/useCountdown.ts` recomputes remaining time every animation
  frame (throttled to ~10/s) and formats it adaptively: years/months/weeks
  while far out, collapsing down to `Dd HH:MM:SS.mmm` as the deadline nears.
- Cards are sorted client-side by `deadline` ascending (soonest first) and
  re-sort live as countdowns move a card past a threshold.
- Urgency bands (see `frontend/lib/priority.ts`): >7d calm, 1–7d amber,
  <24h red + pulsing, overdue = flagged "OVERDUE".

## Notifications (free)

1. **Browser notifications (built in, $0):** `NotificationManager` requests
   `Notification` permission once, then a `setInterval` checks each task's
   configured reminder offsets (default: 24h, 1h, 10m before deadline) and
   fires a native OS notification via the Notifications API — no backend
   push infra needed. This only fires while a tab is open, which is the
   tradeoff of "100% free, zero setup."
2. **Mobile push (optional, still free):** for a notification that reaches
   your phone even with no tab open, pick one:
   - **ntfy.sh** — no signup, just `curl -d "text" ntfy.sh/your-topic-name`
     and install the ntfy app subscribed to that topic. This repo already
     wires it up: set `NTFY_TOPIC` in `backend/.env` and the agent will POST
     reminders there. Simplest option, recommended to start.
   - **Firebase Cloud Messaging (FCM)** — free, official, needs a Firebase
     project + service worker registration in the frontend. More setup, best
     long-term answer once you also want in-app push on installed PWA.
   - **Telegram Bot API** — free, create a bot via @BotFather, POST to
     `api.telegram.org/bot<token>/sendMessage`. Very quick if you already use
     Telegram.

   Default wired: ntfy.sh (zero signup). Swap to FCM/Telegram later by
   implementing `NotificationSender` in `backend/app/services/notification_service.py`.

## Skills (uploadable agent tools)

`POST /api/skills/upload` accepts a Python file defining:

```python
SKILL_NAME = "my_skill"
SKILL_DESCRIPTION = "..."

def run(**kwargs):
    ...
    return {"ok": True}
```

It's saved to `backend/uploaded_skills/` and hot-loaded into the ADK agent's
tool list on next chat turn. **Security note:** this executes arbitrary
Python you upload, by design (it's your own single-tenant deployment) — do
not expose this endpoint publicly without adding auth + sandboxing.

## Database

Local dev uses SQLite (`backend/hourglass.db`, zero setup). Everything reads
`DATABASE_URL` from env (`backend/app/core/config.py`), so moving to Cloud
SQL is a one-line env change — no code change. See "Google Cloud SQL setup"
below for the first-entry Cloud SQL you asked about.

### Google Cloud SQL setup (first entry, for later)

```bash
gcloud sql instances create hourglass-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create hourglass --instance=hourglass-db

gcloud sql users set-password postgres \
  --instance=hourglass-db --password=<STRONG_PASSWORD>
```

Then in `backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://postgres:<PASSWORD>@/hourglass?host=/cloudsql/<PROJECT>:us-central1:hourglass-db
```

Deploy the backend to Cloud Run with `--add-cloudsql-instances=<PROJECT>:us-central1:hourglass-db`.
(This scaffold does not provision GCP resources for you — run the commands
above from a shell with `gcloud` authenticated to your project.)

## Running locally

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set GOOGLE_API_KEY (Gemini) and optionally NTFY_TOPIC
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE=http://localhost:8000
npm run dev
```

Open http://localhost:3000, allow notifications when prompted, and type (or
click the mic and speak) something like:

> "Add a challenge called Kaggle Sprint due 30 September at 6pm"

## Status / what's deliberately deferred for the Oct 5 deadline

Built: chat-driven CRUD via Gemini/ADK agent, ms-precision countdown cards
sorted by urgency, browser notifications, voice input, skill upload, SQLite
now / Cloud SQL-ready config, enterprise folder layout.

Deferred (flag if you need these before Oct 5): user auth/multi-user, actual
Cloud SQL instance provisioning (commands given above, not run — no GCP
credentials in this session), FCM/Telegram push (ntfy.sh wired instead),
automated tests, CI/CD, Cloud Run deploy manifests.
