import type { SGNode } from './node'

export function recordsFor<R>(nodes: SGNode<R>[]): R[] {
  const seen = new Set<R>()
  const out: R[] = []
  for (const n of new Set(nodes)) {
    for (const r of n.records) {
      if (seen.has(r)) continue
      seen.add(r)
      out.push(r)
    }
  }
  return out
}

export function recordsUnder<R>(nodes: SGNode<R>[]): R[] {
  const all = new Set<SGNode<R>>()
  for (const n of nodes) {
    all.add(n)
    for (const d of n.descendants()) all.add(d)
  }
  return recordsFor([...all])
}
