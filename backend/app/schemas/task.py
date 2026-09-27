from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models import TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime
    reminder_offsets_minutes: list[int] | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None
    status: TaskStatus | None = None
    reminder_offsets_minutes: list[int] | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    deadline: datetime
    status: TaskStatus
    reminder_offsets_minutes: str
    created_at: datetime
    updated_at: datetime
