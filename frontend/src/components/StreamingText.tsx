import { useEffect, useState } from 'react'

interface StreamingTextProps {
  text: string
  speed?: number
  className?: string
}

export function StreamingText({
  text,
  speed = 12,
  className = '',
}: StreamingTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)

    if (!text) return

    let index = 0
    const interval = setInterval(() => {
      index += 1
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-slate-400 animate-pulse align-middle" />
      )}
    </span>
  )
}
