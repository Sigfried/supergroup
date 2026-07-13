import { SGNode, type SGContext } from '../node'
import { Supergroup, type BackEdge } from '../collection'

export interface DagItem { id: string; name?: string; parentIds?: string[] }

export function buildDag<R>(items: DagItem[]): Supergroup<R> {
  const ctx: SGContext = { totalRecords: 0 }
  const byId = new Map<string, SGNode<R>>()
  for (const it of items) {
    if (byId.has(it.id)) throw new Error(`duplicate id: ${it.id}`)
    byId.set(it.id, new SGNode<R>({ id: it.id, key: it.id, label: it.name ?? it.id, ctx }))
  }

  const backedges: BackEdge<R>[] = []
  const childIds = new Map<string, string[]>()   // candidate edges, item order
  const indegree = new Map<string, number>(items.map(it => [it.id, 0]))
  const seenEdge = new Set<string>()
  for (const it of items) {
    for (const pid of it.parentIds ?? []) {
      const p = byId.get(pid)
      if (!p) continue                            // unknown parent ids ignored
      const ek = `${pid}→${it.id}`
      if (seenEdge.has(ek)) continue              // duplicate edges collapse
      seenEdge.add(ek)
      if (pid === it.id) {                        // self-loop → backedge
        backedges.push({ parent: p, child: p })
        continue
      }
      const arr = childIds.get(pid)
      if (arr) arr.push(it.id); else childIds.set(pid, [it.id])
      indegree.set(it.id, (indegree.get(it.id) ?? 0) + 1)
    }
  }

  // DFS edge classification: cycle-closing edges → backedges; rest wired.
  const visited = new Set<string>()
  const onStack = new Set<string>()
  const dfs = (startId: string): void => {
    const stack: [string, number][] = [[startId, 0]]
    visited.add(startId)
    onStack.add(startId)
    while (stack.length) {
      const frame = stack[stack.length - 1]!
      const kids = childIds.get(frame[0]) ?? []
      if (frame[1] >= kids.length) { onStack.delete(frame[0]); stack.pop(); continue }
      const cid = kids[frame[1]++]!
      const p = byId.get(frame[0])!
      const c = byId.get(cid)!
      if (onStack.has(cid)) {
        backedges.push({ parent: p, child: c })
      } else {
        p.children.push(c)
        c.parents.push(p)
        if (!visited.has(cid)) { visited.add(cid); onStack.add(cid); stack.push([cid, 0]) }
      }
    }
  }

  const roots: SGNode<R>[] = []
  for (const it of items) if ((indegree.get(it.id) ?? 0) === 0) roots.push(byId.get(it.id)!)
  for (const r of roots) if (!visited.has(r.id)) dfs(r.id)
  // rootless cycle regions: promote the first unvisited node (item order)
  for (const it of items) {
    if (!visited.has(it.id)) { roots.push(byId.get(it.id)!); dfs(it.id) }
  }

  // min-depth by BFS over kept edges
  const seen = new Set(roots.map(r => r.id))
  const queue = [...roots]
  for (const r of roots) r.depth = 0
  while (queue.length) {
    const n = queue.shift()!
    for (const c of n.children) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      c.depth = n.depth + 1
      queue.push(c)
    }
  }

  return new Supergroup<R>(roots, { backedges, ctx })
}
