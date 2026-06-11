import { useState, type FormEvent } from 'react'

interface ChatInputProps {
  onSubmit: (task: string) => void
  disabled?: boolean
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3 border-t border-slate-700 pt-4"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe a coding task..."
        disabled={disabled}
        className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="px-5 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Run →
      </button>
    </form>
  )
}
