import type { BudgetState, TaskStatus } from '../types/agent'

interface BudgetMeterProps {
  budget: BudgetState
  status: TaskStatus
}

export function BudgetMeter({ budget, status }: BudgetMeterProps) {
  const pct =
    budget.stepsMax > 0
      ? Math.min(100, (budget.stepsUsed / budget.stepsMax) * 100)
      : 0
  const isHigh = pct >= 80

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Budget
        </span>
        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isHigh ? 'bg-red-500' : 'bg-slate-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-mono ${isHigh ? 'text-red-400' : 'text-slate-300'}`}>
          {budget.stepsUsed}/{budget.stepsMax}
        </span>
      </div>

      {budget.cost != null && (
        <span className="text-slate-400 font-mono text-xs">
          ${budget.cost.toFixed(3)}
        </span>
      )}

      <span
        className={`text-xs uppercase tracking-wide ${
          status === 'running'
            ? 'text-amber-400'
            : status === 'completed'
              ? 'text-slate-300'
              : status === 'error'
                ? 'text-red-400'
                : 'text-slate-500'
        }`}
      >
        {status}
      </span>
    </div>
  )
}
