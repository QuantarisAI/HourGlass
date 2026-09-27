"""Dynamic loading of user-uploaded "skills" (extra ADK tool functions).

A skill is a .py file in backend/uploaded_skills/ exposing:

    SKILL_NAME = "my_skill"
    SKILL_DESCRIPTION = "what it does"
    def run(**kwargs) -> dict: ...

`run` is wrapped as a plain callable tool named SKILL_NAME with
SKILL_DESCRIPTION as its docstring, then handed to the ADK agent alongside
the built-in task tools.

SECURITY: this imports and executes arbitrary Python from disk. Fine for a
single-operator deployment; do not expose the upload endpoint publicly
without auth + sandboxing.
"""

import importlib.util
from pathlib import Path
from typing import Any, Callable

SKILLS_DIR = Path(__file__).resolve().parent.parent.parent / "uploaded_skills"
SKILLS_DIR.mkdir(exist_ok=True)


def _wrap(module) -> Callable[..., Any] | None:
    name = getattr(module, "SKILL_NAME", None)
    description = getattr(module, "SKILL_DESCRIPTION", "Custom uploaded skill.")
    run_fn = getattr(module, "run", None)
    if not name or not callable(run_fn):
        return None

    def tool(**kwargs) -> Any:
        return run_fn(**kwargs)

    tool.__name__ = name
    tool.__doc__ = description
    return tool


def load_uploaded_skills() -> list[Callable[..., Any]]:
    tools: list[Callable[..., Any]] = []
    for path in sorted(SKILLS_DIR.glob("*.py")):
        try:
            spec = importlib.util.spec_from_file_location(path.stem, path)
            if not spec or not spec.loader:
                continue
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            wrapped = _wrap(module)
            if wrapped:
                tools.append(wrapped)
        except Exception:
            continue
    return tools


def list_skill_files() -> list[str]:
    return [p.name for p in sorted(SKILLS_DIR.glob("*.py"))]


def save_skill_file(filename: str, content: bytes) -> str:
    safe_name = Path(filename).name
    if not safe_name.endswith(".py"):
        safe_name += ".py"
    dest = SKILLS_DIR / safe_name
    dest.write_bytes(content)
    return safe_name
