import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'

export interface CompareOpts { by?: 'path' | 'id' }

export function compare<R>(a: Supergroup<R>, b: Supergroup<R>, opts: CompareOpts = {}): Supergroup<R> {
  const matchKey = opts.by === 'id'
    ? (n: SGNode<R>) => n.id
    : (n: SGNode<R>) => String(n.key)
  const ctx: SGContext = { totalRecords: a.ctx.totalRecords + b.ctx.totalRecords }
  const memo = opts.by === 'id' ? new Map<string, SGNode<R>>() : null

  const mergeLevel = (
    aNodes: SGNode<R>[], bNodes: SGNode<R>[],
    parent: SGNode<R> | null, depth: number, prefix: string,
  ): SGNode<R>[] => {
    const order: string[] = []
    const pairs = new Map<string, { a?: SGNode<R>; b?: SGNode<R> }>()
    for (const n of aNodes) {
      const k = matchKey(n)
      if (!pairs.has(k)) { pairs.set(k, {}); order.push(k) }
      pairs.get(k)!.a = n
    }
    for (const n of bNodes) {
      const k = matchKey(n)
      if (!pairs.has(k)) { pairs.set(k, {}); order.push(k) }
      pairs.get(k)!.b = n
    }
    return order.map(k => {
      const done = memo?.get(k)
      if (done) {
        if (parent && !done.parents.includes(parent)) done.parents.push(parent)
        return done
      }
      const { a: an, b: bn } = pairs.get(k)!
      const src = (an ?? bn)!
      const node = new SGNode<R>({
        // id mode: the match key IS the source id — keep it, no path prefix
        id: memo ? k : prefix + String(src.key),
        key: src.key, label: src.label, dim: src.dim,
        records: [...(an?.records ?? []), ...(bn?.records ?? [])], depth, ctx,
      })
      node.cmp = {
        in: an && bn ? 'both' : an ? 'a' : 'b',
        a: an, b: bn,
        countDelta: (bn?.records.length ?? 0) - (an?.records.length ?? 0),
      }
      if (parent) node.parents.push(parent)
      memo?.set(k, node)
      node.children = mergeLevel(an?.children ?? [], bn?.children ?? [], node, depth + 1, `${node.id}/`)
      return node
    })
  }

  const roots = mergeLevel(a.roots, b.roots, null, 0, '')
  return new Supergroup(roots, { ctx })
}
