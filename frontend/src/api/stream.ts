import type { AgentEventType } from '../types/agent'

const API_BASE = '/api'

export interface CreateTaskResponse {
  task_id: string
  status: string
}

export async function createTask(task: string): Promise<CreateTaskResponse> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create task: ${res.statusText}`)
  }

  return res.json()
}

export function connectTaskStream(
  taskId: string,
  onEvent: (type: AgentEventType, data: Record<string, unknown>) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
): () => void {
  const source = new EventSource(`${API_BASE}/tasks/${taskId}/stream`)

  const handlers: Record<string, (e: MessageEvent) => void> = {}
  const eventTypes: AgentEventType[] = [
    'thinking',
    'tool_call',
    'tool_result',
    'file_write',
    'subagent_start',
    'subagent_end',
    'checkpoint',
    'budget_update',
    'task_complete',
    'error',
  ]

  for (const type of eventTypes) {
    handlers[type] = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>
        onEvent(type, data)
        if (type === 'task_complete' || type === 'error') {
          source.close()
          onComplete()
        }
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)))
      }
    }
    source.addEventListener(type, handlers[type])
  }

  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) {
      onComplete()
    } else {
      onError(new Error('SSE connection error'))
    }
  }

  return () => source.close()
}

export async function fetchFileContent(
  taskId: string,
  path: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/files/${path}`)
  if (!res.ok) throw new Error(`Failed to fetch file: ${path}`)
  const data = await res.json()
  return data.content as string
}
