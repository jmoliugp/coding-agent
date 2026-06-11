import { useMemo } from 'react'
import type { FileNode } from '../types/agent'

export function useFileTree(files: Map<string, string>): FileNode[] {
  return useMemo(() => {
    const root: FileNode[] = []

    const sortedPaths = [...files.keys()].sort()

    for (const filePath of sortedPaths) {
      const parts = filePath.split('/')
      let current = root

      for (let i = 0; i < parts.length; i++) {
        const name = parts[i]
        const isLast = i === parts.length - 1
        const path = parts.slice(0, i + 1).join('/')

        let node = current.find((n) => n.name === name)

        if (!node) {
          node = {
            name,
            path,
            isDirectory: !isLast,
            children: isLast ? undefined : [],
          }
          current.push(node)
        }

        if (!isLast && node.children) {
          current = node.children
        }
      }
    }

    return root
  }, [files])
}
