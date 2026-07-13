import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'
import { recordsFor } from '../selection'
import { computeMetrics } from './metrics'

export function subgraph<R>(sg: Supergroup<R>, ids: Iterable<string>): Supergroup<R> {
  const keep = new Set(ids)
  const ctx: SGContext = { totalRecords: 0 }
  const clone = new Map<string, SGNode<R>>()
  for (const n of sg.nodes) {
    if (!keep.has(n.id)) continue
    clone.set(n.id, new SGNode<R>({
      id: n.id, key: n.key, label: n.label, dim: n.dim, records: [...n.records], ctx,
    }))
  }
  for (const n of sg.nodes) {
    const c1 = clone.get(n.id)
    if (!c1) continue
    for (const ch of n.children) {
      const c2 = clone.get(ch.id)
      if (c2) { c1.children.push(c2); c2.parents.push(c1) }
    }
  }
  const backedges = sg.backedges
    .filter(e => keep.has(e.parent.id) && keep.has(e.child.id))
    .map(e => ({ parent: clone.get(e.parent.id)!, child: clone.get(e.child.id)! }))
  const roots = [...clone.values()].filter(n => !n.parents.length)
  // min-depth BFS over kept edges
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
  ctx.totalRecords = recordsFor([...clone.values()]).length
  const sub = new Supergroup<R>(roots, { backedges, ctx })
  computeMetrics(sub)
  return sub
}
