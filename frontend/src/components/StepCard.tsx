import { motion } from 'framer-motion'
import type { AgentEvent } from '../types/agent'
import { StreamingText } from './StreamingText'

const EVENT_META: Record<
  string,
  { icon: string; label: string; borderClass: string }
> = {
  thinking: { icon: '🧠', label: 'Thinking', borderClass: 'border-slate-600' },
  tool_call: { icon: '🔧', label: 'Tool call', borderClass: 'border-amber-500/60' },
  tool_result: { icon: '✓', label: 'Tool result', borderClass: 'border-slate-600' },
  file_write: { icon: '📄', label: 'File write', borderClass: 'border-slate-600' },
  subagent_start: { icon: '🤖', label: 'Subagent start', borderClass: 'border-slate-600' },
  subagent_end: { icon: '🤖', label: 'Subagent end', borderClass: 'border-slate-600' },
  checkpoint: { icon: '💾', label: 'Checkpoint', borderClass: 'border-slate-600' },
  budget_update: { icon: '📊', label: 'Budget', borderClass: 'border-slate-600' },
  task_complete: { icon: '✅', label: 'Complete', borderClass: 'border-slate-600' },
  error: { icon: '⚠', label: 'Error', borderClass: 'border-red-500' },
}

function renderContent(event: AgentEvent) {
  const { type, data } = event

  switch (type) {
    case 'thinking':
      return (
        <StreamingText
          text={String(data.content ?? '')}
          className="text-slate-300 text-sm whitespace-pre-wrap"
        />
      )
    case 'tool_call':
      return (
        <div className="text-sm">
          <span className="text-amber-400 font-mono">{String(data.tool)}</span>
          <pre className="mt-1 text-xs text-slate-400 overflow-x-auto">
            {JSON.stringify(data.args, null, 2)}
          </pre>
        </div>
      )
    case 'tool_result':
      return (
        <div className="text-sm text-slate-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          {String(data.result ?? '').slice(0, 500)}
        </div>
      )
    case 'file_write':
      return (
        <div className="text-sm">
          <span className="text-slate-300 font-mono">{String(data.path)}</span>
        </div>
      )
    case 'subagent_start':
      return (
        <div className="text-sm text-slate-300 pl-4">
          Started: <span className="text-white">{String(data.name)}</span>
        </div>
      )
    case 'subagent_end':
      return (
        <div className="text-sm text-slate-300 pl-4">
          <span className="text-white">{String(data.name)}</span> finished
        </div>
      )
    case 'checkpoint':
      return (
        <div className="text-sm text-slate-400">Step {String(data.step)}</div>
      )
    case 'budget_update':
      return (
        <div className="text-sm text-slate-400">
          {String(data.steps_used)}/{String(data.steps_max)} steps
        </div>
      )
    case 'task_complete':
      return (
        <div className="text-sm text-slate-300">
          Project: <span className="text-amber-400">{String(data.project_path)}</span>
        </div>
      )
    case 'error':
      return (
        <div className="text-sm text-red-400">{String(data.message)}</div>
      )
    default:
      return null
  }
}

interface StepCardProps {
  event: AgentEvent
  index: number
}

export function StepCard({ event, index }: StepCardProps) {
  const meta = EVENT_META[event.type] ?? EVENT_META.thinking
  const isSubagent = event.type.startsWith('subagent')

  if (event.type === 'budget_update') return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
      className={`border rounded-lg p-3 bg-slate-900/50 ${meta.borderClass} ${
        isSubagent ? 'ml-4' : ''
      } ${event.type === 'error' ? 'bg-red-950/50' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span>{meta.icon}</span>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {meta.label}
        </span>
      </div>
      {renderContent(event)}
    </motion.div>
  )
}
