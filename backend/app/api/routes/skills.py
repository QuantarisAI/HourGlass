from fastapi import APIRouter, File, UploadFile

from app.agents.skill_loader import list_skill_files, save_skill_file

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("")
def list_skills():
    return {"skills": list_skill_files()}


@router.post("/upload")
async def upload_skill(file: UploadFile = File(...)):
    content = await file.read()
    saved_as = save_skill_file(file.filename or "skill.py", content)
    return {"saved_as": saved_as}
