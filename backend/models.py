from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    error = "error"


class TaskCreateRequest(BaseModel):
    task: str = Field(..., min_length=1)


class TaskCreateResponse(BaseModel):
    task_id: str
    status: TaskStatus


class AgentEvent(BaseModel):
    type: str
    data: dict[str, Any]


class ThinkingEvent(BaseModel):
    content: str


class ToolCallEvent(BaseModel):
    tool: str
    args: dict[str, Any]


class ToolResultEvent(BaseModel):
    tool: str
    result: str


class FileWriteEvent(BaseModel):
    path: str
    content: str


class SubagentStartEvent(BaseModel):
    name: str


class SubagentEndEvent(BaseModel):
    name: str
    summary: str


class CheckpointEvent(BaseModel):
    step: int


class BudgetUpdateEvent(BaseModel):
    steps_used: int
    steps_max: int
    cost: float | None = None
    timeout_remaining: int | None = None


class TaskCompleteEvent(BaseModel):
    project_path: str


class ErrorEvent(BaseModel):
    message: str
    recoverable: bool = False


class FileInfo(BaseModel):
    path: str
    size: int


class FileListResponse(BaseModel):
    files: list[FileInfo]


class FileContentResponse(BaseModel):
    path: str
    content: str
