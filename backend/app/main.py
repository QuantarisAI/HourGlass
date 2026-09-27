from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, skills, tasks
from app.core.config import get_settings
from app.db.database import init_db

settings = get_settings()

app = FastAPI(title="HourGlass API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(skills.router)
