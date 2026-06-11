export type AgentEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'file_write'
  | 'subagent_start'
  | 'subagent_end'
  | 'checkpoint'
  | 'budget_update'
  | 'task_complete'
  | 'error'

export interface AgentEvent {
  id: string
  type: AgentEventType
  data: Record<string, unknown>
  timestamp: number
}

export interface BudgetState {
  stepsUsed: number
  stepsMax: number
  cost?: number
  timeoutRemaining?: number
}

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
}

export type TaskStatus = 'idle' | 'pending' | 'running' | 'completed' | 'error'
