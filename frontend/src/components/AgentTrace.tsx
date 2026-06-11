import type { AgentEvent } from '../types/agent'
import { StepCard } from './StepCard'

interface AgentTraceProps {
  events: AgentEvent[]
}

export function AgentTrace({ events }: AgentTraceProps) {
  const visibleEvents = events.filter((e) => e.type !== 'budget_update')

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        Agent Trace
      </div>

      {visibleEvents.length === 0 ? (
        <div className="text-slate-500 text-sm italic">
          Submit a task to see the agent work...
        </div>
      ) : (
        visibleEvents.map((event, index) => (
          <StepCard key={event.id} event={event} index={index} />
        ))
      )}
    </div>
  )
}
