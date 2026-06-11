import type { FileNode } from '../types/agent'

interface FileExplorerProps {
  tree: FileNode[]
  selectedFile: string | null
  onSelect: (path: string) => void
}

function FileTreeNode({
  node,
  selectedFile,
  onSelect,
  depth = 0,
}: {
  node: FileNode
  selectedFile: string | null
  onSelect: (path: string) => void
  depth?: number
}) {
  const isSelected = selectedFile === node.path

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      {node.isDirectory ? (
        <div className="text-slate-400 text-sm py-0.5">
          📁 {node.name}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(node.path)}
          className={`w-full text-left text-sm py-0.5 px-1 rounded font-mono transition-colors ${
            isSelected
              ? 'bg-slate-800 text-white'
              : 'text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          📄 {node.name}
        </button>
      )}

      {node.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          selectedFile={selectedFile}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function FileExplorer({ tree, selectedFile, onSelect }: FileExplorerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        File Explorer
      </div>

      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <div className="text-slate-500 text-sm italic">
            Files appear here as the agent writes them...
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
