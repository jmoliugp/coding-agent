# Coding Agent

A Bun + React + FastAPI monorepo that exposes a deep coding agent — powered by [simple-coding-agent](https://github.com/coderonfleek/simple-coding-agent) and LangGraph — with real-time SSE streaming so you can watch every step of the agent's reasoning, tool calls, file writes, and subagent activity as they happen.

---

## What it does

You give it a natural-language coding task. It runs an LLM-backed agent that reasons, calls tools, writes files, and even spins up a code-reviewer subagent — all streamed back to the browser live. The UI renders a scrolling trace of every event (thinking, tool calls, checkpoints, file writes) alongside a virtual filesystem explorer with syntax-highlighted file previews.

```
┌────────────────────────────────────────────────────────┐
│  CODING AGENT                [Budget: ▓▓▓▓░░░ 23/50]  │
├─────────────────────────┬──────────────────────────────┤
│                         │                              │
│   Agent Trace           │   File Explorer              │
│   ─────────────         │   ─────────────              │
│   ○ thinking...         │   📁 email-validator/        │
│   ○ tool_call: write_.. │     📄 main.py               │
│   ○ file_write: main.py │     📄 test_main.py          │
│   ○ subagent: reviewer  │     📄 README.md             │
│   ○ checkpoint (step 8) │                              │
│   ○ tool_result: ...    │   [main.py selected]         │
│                         │   ─────────────────          │
│                         │   def validate_email(...)    │
│                         │     ...                      │
├─────────────────────────┴──────────────────────────────┤
│  > Describe a coding task...                  [Run →]  │
└────────────────────────────────────────────────────────┘
```

---

## How it works

The communication flow is **Frontend → Backend → Agent → Frontend** via Server-Sent Events (SSE):

1. The frontend sends `POST /api/tasks` and receives a `task_id`.
2. It immediately opens `EventSource` on `GET /api/tasks/{task_id}/stream` — a persistent `text/event-stream` HTTP connection.
3. The backend runs the agent in the background via `agent.stream(..., stream_mode="updates")` — LangGraph's native streaming generator.
4. For each update, the backend classifies the event, serializes it as SSE, and pushes it to the client without closing the connection.
5. The frontend receives events in `useAgentStream`, updates the Zustand store, and React re-renders in real time.

```
Frontend                    Backend                     Agent (LangGraph)
   │                           │                              │
   │── POST /api/tasks ────────►│                              │
   │◄─ { task_id: "task-1" } ──│                              │
   │                           │                              │
   │── GET /stream ────────────►│── agent.stream() ───────────►│
   │                           │                              │ reasoning...
   │◄── event: thinking ───────│◄─ node: agent, messages ─────│
   │◄── event: tool_call ──────│◄─ node: tools, tool_calls ───│
   │◄── event: file_write ─────│◄─ node: filesystem ──────────│
   │◄── event: subagent_start ─│◄─ node: code-reviewer ───────│
   │◄── event: checkpoint ─────│◄─ MemorySaver step saved ────│
   │◄── event: task_complete ──│◄─ END node reached ──────────│
   │                           │                              │
   │── [connection closes] ────►│                              │
```

SSE is the right transport here because the flow is strictly **unidirectional** — the agent talks, the frontend listens. WebSocket would only be needed if adding Human-in-the-loop (e.g. `interrupt()` + `POST /api/tasks/{id}/approve`).

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Root runtime | Bun | Workspace, scripts, frontend dev server |
| Frontend | React 18 + Vite + TypeScript | |
| Styles | Tailwind CSS v4 | |
| Animations | Framer Motion | Card slide-in, typing cursor |
| Global state | Zustand | Agent events, file tree, budget |
| Streaming client | EventSource API (SSE) | `useAgentStream` hook |
| Backend | FastAPI + uvicorn | Python 3.11 |
| Agent | `deepagents` + LangGraph | `simple_coding_agent.py` |
| LLM | OpenAI `gpt-4o-mini` | Configurable via `.env` |
| Streaming server | FastAPI `StreamingResponse` | `text/event-stream` |
| Syntax highlight | Shiki | File viewer in frontend |

---

## Project structure

```
coding-agent-demo/
├── package.json              # Bun workspace root
├── .env.example
│
├── frontend/                 # React + Vite (Bun)
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── api/
│       │   └── stream.ts         # SSE client + event parsing
│       ├── components/
│       │   ├── ChatInput.tsx     # Task input
│       │   ├── AgentTrace.tsx    # Vertical event timeline
│       │   ├── StepCard.tsx      # Card for each event type
│       │   ├── FileExplorer.tsx  # Real-time file tree
│       │   ├── FileViewer.tsx    # File content with syntax highlight
│       │   ├── BudgetMeter.tsx   # Steps / cost / timeout indicator
│       │   └── StreamingText.tsx # Token-by-token typewriter render
│       ├── hooks/
│       │   ├── useAgentStream.ts # Main hook: SSE → state accumulation
│       │   └── useFileTree.ts    # Keeps file tree in sync with events
│       ├── store/
│       │   └── agentStore.ts     # Zustand: global session state
│       └── styles/
│           └── globals.css
│
└── backend/                  # Python / FastAPI
    ├── pyproject.toml
    ├── .python-version       # 3.11
    ├── main.py               # FastAPI app, routes, CORS
    ├── agent.py              # Deep agent wrapper
    ├── streaming.py          # SSE generator with typed events
    ├── models.py             # Pydantic models for events and responses
    └── projects/             # Virtual FS where the agent writes files
```

---

## API

### `POST /api/tasks`

Start a new coding task.

```json
// Request
{ "task": "Write an email validator in Python with tests" }

// Response
{ "task_id": "task-42", "status": "running" }
```

### `GET /api/tasks/{task_id}/stream`

SSE stream of agent events. `Content-Type: text/event-stream`.

Each event follows the format:

```
event: <type>
data: <JSON>
```

| Event | When | Key payload |
|-------|------|-------------|
| `thinking` | LLM is reasoning | `{ content: string }` |
| `tool_call` | Agent invokes a tool | `{ tool: string, args: object }` |
| `tool_result` | Tool returned a result | `{ tool: string, result: string }` |
| `file_write` | File created or modified | `{ path: string, content: string }` |
| `subagent_start` | Code-reviewer subagent starts | `{ name: string }` |
| `subagent_end` | Subagent finished | `{ name: string, summary: string }` |
| `checkpoint` | State saved by MemorySaver | `{ step: number }` |
| `budget_update` | Budget status update | `{ steps_used: number, steps_max: number }` |
| `task_complete` | Task finished | `{ project_path: string }` |
| `error` | Recoverable or fatal error | `{ message: string, recoverable: bool }` |

### `GET /api/tasks/{task_id}/files`

List files created by the agent in the virtual filesystem.

### `GET /api/tasks/{task_id}/files/{path}`

Get the contents of a specific file.

### `GET /api/health`

Health check — returns `{ "status": "ok" }`.

---

## Key frontend components

### `useAgentStream`

Central hook. Opens the SSE connection, parses events, and updates the Zustand store.

```typescript
const { events, files, budget, status } = useAgentStream(taskId)
```

### `AgentTrace`

Vertical timeline of all received events. Each `StepCard` enters with a slide-in animation (Framer Motion). Event types have distinct icons and border colors:

- `thinking` — brain icon, slate border, typewriter text effect
- `tool_call` — tool icon, amber border
- `file_write` — file icon, slate border + path preview
- `subagent_start/end` — nested agent icon, slate border with indent
- `checkpoint` — checkpoint icon, step number
- `error` — red border

### `BudgetMeter`

Progress bar with `steps_used / steps_max`, cumulative cost indicator, and timeout countdown. Turns red above 80% budget usage.

### `FileExplorer` + `FileViewer`

File tree that updates in real time with each `file_write` event. Clicking a file opens it in `FileViewer` with Shiki syntax highlighting for Python, Markdown, and more.

### `StreamingText`

Receives `thinking` chunks and renders them token-by-token with a blinking cursor animation — simulating the LLM's reasoning appearing live on screen.

---

## Backend — Agent integration

`agent.py` wraps the agent from `simple_coding_agent.py`:

```python
from simple_coding_agent import agent

def run_task(task_id: str, task: str):
    config = {"configurable": {"thread_id": task_id}}

    for step in agent.stream(
        {"messages": [{"role": "user", "content": task}]},
        config,
        stream_mode="updates"
    ):
        for node_name, update in step.items():
            yield classify_event(node_name, update)
```

`streaming.py` takes that generator and formats it as SSE:

```python
async def sse_generator(task_id: str, task: str):
    for event in run_task(task_id, task):
        yield f"event: {event.type}\ndata: {event.model_dump_json()}\n\n"
```

---

## Setup

```bash
# 1. Install frontend dependencies
bun install

# 2. Install backend dependencies
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .

# 3. Configure environment
cp .env.example .env
# Edit .env — set your OPENAI_API_KEY

# 4. Bootstrap everything in one command
cd ..
bun run bootstrap
```

## Dev

```bash
bun run dev
```

Starts backend (`:8000`) and frontend (`:5173`) in parallel. `Ctrl+C` stops both.

To run separately:

```bash
bun run dev:backend
bun run dev:frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| Health | http://localhost:8000/api/health |

---

## Environment variables

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
AGENT_MAX_STEPS=50
AGENT_MAX_COST=1.0
AGENT_TIMEOUT=300
CORS_ORIGIN=http://localhost:5173
```

Copy `.env.example` to `.env` and fill in your API key. `OPENAI_MODEL`, `AGENT_MAX_STEPS`, `AGENT_MAX_COST`, and `AGENT_TIMEOUT` all have sensible defaults.
