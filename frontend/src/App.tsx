import { AgentTrace } from './components/AgentTrace'
import { BudgetMeter } from './components/BudgetMeter'
import { ChatInput } from './components/ChatInput'
import { FileExplorer } from './components/FileExplorer'
import { FileViewer } from './components/FileViewer'
import { useAgentStream } from './hooks/useAgentStream'
import { useFileTree } from './hooks/useFileTree'
import { useAgentStore } from './store/agentStore'

export default function App() {
  const { events, files, budget, status, projectPath, error, startTask } =
    useAgentStream()
  const selectedFile = useAgentStore((s) => s.selectedFile)
  const setSelectedFile = useAgentStore((s) => s.setSelectedFile)
  const tree = useFileTree(files)

  const isRunning = status === 'running'

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">CODING AGENT</h1>
          {projectPath && (
            <p className="text-xs text-slate-400 mt-0.5">
              Project: <span className="text-amber-400">{projectPath}</span>
            </p>
          )}
        </div>
        <BudgetMeter budget={budget} status={status} />
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0 overflow-hidden">
        <section className="border-r border-slate-700 p-4 overflow-hidden flex flex-col">
          <AgentTrace events={events} />
        </section>

        <section className="p-4 overflow-hidden flex flex-col gap-4">
          <div className="h-1/3 min-h-[120px] overflow-hidden flex flex-col">
            <FileExplorer
              tree={tree}
              selectedFile={selectedFile}
              onSelect={setSelectedFile}
            />
          </div>
          <div className="flex-1 min-h-0 border border-slate-600 rounded-lg p-3 bg-slate-900/50 overflow-hidden">
            <FileViewer
              path={selectedFile}
              content={selectedFile ? files.get(selectedFile) ?? null : null}
            />
          </div>
        </section>
      </main>

      <footer className="shrink-0 px-6 pb-6">
        {error && (
          <div className="mb-3 border border-red-500 rounded p-3 bg-red-950/50 text-sm text-red-400">
            {error}
          </div>
        )}
        <ChatInput onSubmit={startTask} disabled={isRunning} />
      </footer>
    </div>
  )
}
