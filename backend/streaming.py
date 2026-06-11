from __future__ import annotations

import json
from collections.abc import Generator

from agent import run_task
from models import AgentEvent


def sse_generator_sync(task_id: str, task: str) -> Generator[str, None, None]:
    try:
        for event in run_task(task_id, task):
            yield _format_sse(event)
    except Exception as exc:
        error = AgentEvent(type="error", data={"message": str(exc), "recoverable": False})
        yield _format_sse(error)


def _format_sse(event: AgentEvent) -> str:
    return f"event: {event.type}\ndata: {json.dumps(event.data)}\n\n"
