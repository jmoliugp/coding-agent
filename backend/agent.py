from __future__ import annotations

import json
import os
from collections.abc import Generator
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from models import AgentEvent
from simple_coding_agent import PROJECTS_DIR, get_agent

MAX_STEPS = int(os.getenv("AGENT_MAX_STEPS", "50"))


def _normalize_messages(raw: Any) -> list[BaseMessage]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [m for m in raw if isinstance(m, BaseMessage)]
    if isinstance(raw, BaseMessage):
        return [raw]
    return []


def _extract_file_write(tool_name: str, args: dict[str, Any]) -> AgentEvent | None:
    if tool_name not in ("write_file", "edit_file"):
        return None

    path = args.get("file_path") or args.get("path") or args.get("filename")
    content = args.get("content") or args.get("new_string") or ""

    if not path:
        return None

    return AgentEvent(type="file_write", data={"path": str(path), "content": str(content)})


def _classify_message(message: BaseMessage, step: int) -> list[AgentEvent]:
    events: list[AgentEvent] = []

    if isinstance(message, AIMessage):
        if message.tool_calls:
            for call in message.tool_calls:
                tool_name = call.get("name", "unknown")
                args = call.get("args") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {"raw": args}

                events.append(
                    AgentEvent(
                        type="tool_call",
                        data={"tool": tool_name, "args": args},
                    )
                )

                if tool_name == "task":
                    subagent = args.get("subagent_type") or args.get("name") or "subagent"
                    events.append(
                        AgentEvent(type="subagent_start", data={"name": str(subagent)})
                    )

                file_event = _extract_file_write(tool_name, args if isinstance(args, dict) else {})
                if file_event:
                    events.append(file_event)
        elif message.content:
            content = message.content
            if isinstance(content, list):
                text_parts = [
                    block.get("text", "")
                    for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                ]
                content = "\n".join(text_parts)
            if content and str(content).strip():
                events.append(
                    AgentEvent(type="thinking", data={"content": str(content)})
                )

    elif isinstance(message, ToolMessage):
        tool_name = message.name or "unknown"
        result = message.content
        if not isinstance(result, str):
            result = str(result)

        events.append(
            AgentEvent(type="tool_result", data={"tool": tool_name, "result": result})
        )

        if tool_name == "task":
            events.append(
                AgentEvent(
                    type="subagent_end",
                    data={"name": "code-reviewer", "summary": result[:500]},
                )
            )

    return events


def _detect_project_path() -> str:
    if not os.path.isdir(PROJECTS_DIR):
        return ""

    subdirs = [
        d
        for d in os.listdir(PROJECTS_DIR)
        if os.path.isdir(os.path.join(PROJECTS_DIR, d)) and not d.startswith(".")
    ]
    if not subdirs:
        return ""

    latest = max(
        subdirs,
        key=lambda d: os.path.getmtime(os.path.join(PROJECTS_DIR, d)),
    )
    return latest


def run_task(task_id: str, task: str) -> Generator[AgentEvent, None, None]:
    config = {"configurable": {"thread_id": task_id}}
    step_count = 0

    yield AgentEvent(
        type="budget_update",
        data={"steps_used": 0, "steps_max": MAX_STEPS, "cost": 0.0},
    )

    try:
        agent = get_agent()
        for step in agent.stream(
            {"messages": [{"role": "user", "content": task}]},
            config,
            stream_mode="updates",
        ):
            step_count += 1

            yield AgentEvent(type="checkpoint", data={"step": step_count})
            yield AgentEvent(
                type="budget_update",
                data={"steps_used": step_count, "steps_max": MAX_STEPS},
            )

            for _node_name, update in step.items():
                if not update:
                    continue

                messages = _normalize_messages(update.get("messages"))
                for message in messages:
                    yield from _classify_message(message, step_count)

        project_path = _detect_project_path()
        yield AgentEvent(
            type="task_complete",
            data={"project_path": project_path or "unknown"},
        )

    except Exception as exc:
        yield AgentEvent(
            type="error",
            data={"message": str(exc), "recoverable": False},
        )
        raise
