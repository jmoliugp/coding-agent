import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

interface FileViewerProps {
  path: string | null
  content: string | null
}

function guessLanguage(path: string): string {
  if (path.endsWith('.py')) return 'python'
  if (path.endsWith('.md')) return 'markdown'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
  if (path.endsWith('.js')) return 'javascript'
  if (path.endsWith('.txt')) return 'text'
  return 'text'
}

export function FileViewer({ path, content }: FileViewerProps) {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    if (!path || content == null) {
      setHtml('')
      return
    }

    let cancelled = false

    codeToHtml(content, {
      lang: guessLanguage(path),
      theme: 'github-dark',
    }).then((result) => {
      if (!cancelled) setHtml(result)
    })

    return () => {
      cancelled = true
    }
  }, [path, content])

  if (!path || content == null) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic">
        Select a file to preview
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="text-xs font-mono text-slate-400 mb-2 border-b border-slate-700 pb-2">
        {path}
      </div>
      <div
        className="flex-1 overflow-auto text-sm [&_pre]:!bg-transparent [&_pre]:p-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
