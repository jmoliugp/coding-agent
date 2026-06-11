from __future__ import annotations

import os
import threading
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import (
    FileContentResponse,
    FileInfo,
    FileListResponse,
    TaskCreateRequest,
    TaskCreateResponse,
    TaskStatus,
)
from simple_coding_agent import PROJECTS_DIR
from streaming import sse_generator_sync

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="Coding Agent Demo")

cors_origin = os.getenv("CORS_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks: dict[str, dict] = {}
task_streams: dict[str, list[str]] = {}
task_lock = threading.Lock()


def _run_agent_task(task_id: str, task: str) -> None:
    with task_lock:
        tasks[task_id]["status"] = TaskStatus.running
        task_streams[task_id] = []

    try:
        for chunk in sse_generator_sync(task_id, task):
            with task_lock:
                task_streams.setdefault(task_id, []).append(chunk)
    except Exception as exc:
        with task_lock:
            tasks[task_id]["status"] = TaskStatus.error
            tasks[task_id]["error"] = str(exc)
            return

    with task_lock:
        tasks[task_id]["status"] = TaskStatus.completed


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/tasks", response_model=TaskCreateResponse)
def create_task(body: TaskCreateRequest, background_tasks: BackgroundTasks):
    task_id = f"task-{uuid.uuid4().hex[:8]}"
    with task_lock:
        tasks[task_id] = {
            "task": body.task,
            "status": TaskStatus.pending,
        }
        task_streams[task_id] = []

    background_tasks.add_task(_run_agent_task, task_id, body.task)

    return TaskCreateResponse(task_id=task_id, status=TaskStatus.running)


@app.get("/api/tasks/{task_id}/stream")
def stream_task(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    def event_generator():
        sent = 0
        while True:
            with task_lock:
                chunks = task_streams.get(task_id, [])
                status = tasks[task_id]["status"]

            while sent < len(chunks):
                yield chunks[sent]
                sent += 1

            if status in (TaskStatus.completed, TaskStatus.error) and sent >= len(chunks):
                break

            import time

            time.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _resolve_project_files(task_id: str) -> list[FileInfo]:
    project_root = Path(PROJECTS_DIR)
    if not project_root.exists():
        return []

    files: list[FileInfo] = []
    for path in sorted(project_root.rglob("*")):
        if path.is_file() and not path.name.startswith("."):
            rel = path.relative_to(project_root)
            files.append(FileInfo(path=str(rel), size=path.stat().st_size))
    return files


@app.get("/api/tasks/{task_id}/files", response_model=FileListResponse)
def list_files(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return FileListResponse(files=_resolve_project_files(task_id))


@app.get("/api/tasks/{task_id}/files/{file_path:path}", response_model=FileContentResponse)
def get_file(task_id: str, file_path: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    full_path = (Path(PROJECTS_DIR) / file_path).resolve()
    projects_resolved = Path(PROJECTS_DIR).resolve()

    if not str(full_path).startswith(str(projects_resolved)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileContentResponse(path=file_path, content=full_path.read_text(encoding="utf-8"))
