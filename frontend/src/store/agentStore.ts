import { create } from 'zustand'
import type { AgentEvent, BudgetState, TaskStatus } from '../types/agent'

interface AgentStore {
  taskId: string | null
  task: string
  status: TaskStatus
  events: AgentEvent[]
  files: Map<string, string>
  selectedFile: string | null
  budget: BudgetState
  projectPath: string | null
  error: string | null

  setTask: (task: string) => void
  setTaskId: (taskId: string) => void
  setStatus: (status: TaskStatus) => void
  addEvent: (event: AgentEvent) => void
  setFile: (path: string, content: string) => void
  setSelectedFile: (path: string | null) => void
  setBudget: (budget: Partial<BudgetState>) => void
  setProjectPath: (path: string) => void
  setError: (error: string) => void
  reset: () => void
}

const initialBudget: BudgetState = {
  stepsUsed: 0,
  stepsMax: 50,
  cost: 0,
}

export const useAgentStore = create<AgentStore>((set) => ({
  taskId: null,
  task: '',
  status: 'idle',
  events: [],
  files: new Map(),
  selectedFile: null,
  budget: initialBudget,
  projectPath: null,
  error: null,

  setTask: (task) => set({ task }),
  setTaskId: (taskId) => set({ taskId }),
  setStatus: (status) => set({ status }),
  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),
  setFile: (path, content) =>
    set((state) => {
      const files = new Map(state.files)
      files.set(path, content)
      return { files, selectedFile: state.selectedFile ?? path }
    }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  setBudget: (budget) =>
    set((state) => ({ budget: { ...state.budget, ...budget } })),
  setProjectPath: (path) => set({ projectPath: path }),
  setError: (error) => set({ error, status: 'error' }),
  reset: () =>
    set({
      taskId: null,
      status: 'idle',
      events: [],
      files: new Map(),
      selectedFile: null,
      budget: initialBudget,
      projectPath: null,
      error: null,
    }),
}))
