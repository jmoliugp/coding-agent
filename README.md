# Coding Agent

Bun + React + FastAPI monorepo that exposes the coding agent from
[simple-coding-agent](https://github.com/coderonfleek/simple-coding-agent) with
real-time SSE streaming.

## Structure

```
coding-agent/
├── frontend/     # React + Vite + Tailwind
├── backend/      # FastAPI + deepagents
└── package.json  # Bun workspace root
```

## Setup

```bash
bun run bootstrap
# Edit .env and add OPENAI_API_KEY
```

## Dev

```bash
bun run dev
```

Starts the backend (8000) and frontend (5173) in parallel. Ctrl+C stops both.

To run separately:

```bash
bun run dev:backend
bun run dev:frontend
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Health: http://localhost:8000/api/health

## API

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/tasks` | Start a task `{ "task": "..." }` |
| GET | `/api/tasks/{id}/stream` | SSE event stream |
| GET | `/api/tasks/{id}/files` | List generated files |
| GET | `/api/tasks/{id}/files/{path}` | File contents |
