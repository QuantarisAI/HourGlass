from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Task, TaskStatus


def list_tasks(db: Session, include_completed: bool = True) -> list[Task]:
    stmt = select(Task)
    if not include_completed:
        stmt = stmt.where(Task.status == TaskStatus.active)
    stmt = stmt.order_by(Task.deadline.asc())
    return list(db.scalars(stmt))


def get_task(db: Session, task_id: str) -> Task | None:
    return db.get(Task, task_id)


def find_task_by_title(db: Session, title_fragment: str) -> Task | None:
    stmt = (
        select(Task)
        .where(Task.title.ilike(f"%{title_fragment}%"))
        .order_by(Task.deadline.asc())
    )
    return db.scalars(stmt).first()


def create_task(
    db: Session,
    title: str,
    deadline: datetime,
    description: str | None = None,
    reminder_offsets_minutes: list[int] | None = None,
) -> Task:
    task = Task(
        title=title,
        description=description,
        deadline=deadline,
        reminder_offsets_minutes=",".join(str(m) for m in reminder_offsets_minutes)
        if reminder_offsets_minutes
        else "1440,60,10",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, **fields) -> Task:
    for key, value in fields.items():
        if value is None:
            continue
        if key == "reminder_offsets_minutes" and isinstance(value, list):
            value = ",".join(str(m) for m in value)
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()


def complete_task(db: Session, task: Task) -> Task:
    task.status = TaskStatus.completed
    db.commit()
    db.refresh(task)
    return task
