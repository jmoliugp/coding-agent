import { useCallback, useEffect, useRef } from 'react'
import { connectTaskStream, createTask } from '../api/stream'
import { useAgentStore } from '../store/agentStore'
import type { AgentEvent, AgentEventType } from '../types/agent'

let eventCounter = 0

function makeEventId(): string {
  eventCounter += 1
  return `evt-${Date.now()}-${eventCounter}`
}

export function useAgentStream() {
  const disconnectRef = useRef<(() => void) | null>(null)

  const {
    taskId,
    events,
    files,
    budget,
    status,
    projectPath,
    error,
    setTaskId,
    setStatus,
    addEvent,
    setFile,
    setBudget,
    setProjectPath,
    setError,
    reset,
  } = useAgentStore()

  const handleEvent = useCallback(
    (type: AgentEventType, data: Record<string, unknown>) => {
      const event: AgentEvent = {
        id: makeEventId(),
        type,
        data,
        timestamp: Date.now(),
      }
      addEvent(event)

      switch (type) {
        case 'thinking':
          break
        case 'tool_call':
          break
        case 'tool_result':
          break
        case 'file_write': {
          const path = String(data.path ?? '')
          const content = String(data.content ?? '')
          if (path) setFile(path, content)
          break
        }
        case 'subagent_start':
        case 'subagent_end':
          break
        case 'checkpoint':
          break
        case 'budget_update':
          setBudget({
            stepsUsed: Number(data.steps_used ?? 0),
            stepsMax: Number(data.steps_max ?? 50),
            cost: data.cost != null ? Number(data.cost) : undefined,
            timeoutRemaining:
              data.timeout_remaining != null
                ? Number(data.timeout_remaining)
                : undefined,
          })
          break
        case 'task_complete':
          setProjectPath(String(data.project_path ?? ''))
          setStatus('completed')
          break
        case 'error':
          setError(String(data.message ?? 'Unknown error'))
          break
      }
    },
    [addEvent, setBudget, setError, setFile, setProjectPath, setStatus],
  )

  const startTask = useCallback(
    async (task: string) => {
      reset()
      setStatus('running')

      try {
        const { task_id } = await createTask(task)
        setTaskId(task_id)

        disconnectRef.current?.()
        disconnectRef.current = connectTaskStream(
          task_id,
          handleEvent,
          (err) => {
            console.error('[SSE]', err)
            setError(err.message)
          },
          () => setStatus('completed'),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [handleEvent, reset, setError, setStatus, setTaskId],
  )

  useEffect(() => {
    return () => disconnectRef.current?.()
  }, [])

  return {
    taskId,
    events,
    files,
    budget,
    status,
    projectPath,
    error,
    startTask,
  }
}
