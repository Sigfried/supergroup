import { SGNode, type SGContext } from './node'
import { Supergroup } from './collection'
import { normalizeDims, type DimInput, type NormalDim } from './dims'

export interface GroupOpts<R> {
  root?: 'none' | 'synthetic'
  excludeValues?: unknown[]
}

/** Map-identity form of a key: Dates compare by value (es6-branch fix) */
function mapKey(key: unknown): unknown {
  return key instanceof Date ? ` date:${key.getTime()}` : key
}

function isExcluded(key: unknown, excludeValues?: unknown[]): boolean {
  return !!excludeValues?.some(v => v === key || String(v) === String(key))
}

export function groupLevel<R>(
  records: R[],
  dim: NormalDim<R>,
  parent: SGNode<R> | null,
  ctx: SGContext,
  depth: number,
  idPrefix: string,
  opts: GroupOpts<R>,
): SGNode<R>[] {
  const byKey = new Map<unknown, SGNode<R>>()
  for (const r of records) {
    const raw = dim.accessor(r)
    const keys = dim.multi && Array.isArray(raw) ? raw : [raw]
    for (const key of keys) {
      if (isExcluded(key, opts.excludeValues)) continue
      const mk = mapKey(key)
      let node = byKey.get(mk)
      if (!node) {
        node = new SGNode<R>({
          id: idPrefix + String(key), key, label: String(key), dim: dim.name, depth, ctx,
        })
        if (parent) node.parents.push(parent)
        byKey.set(mk, node)
      }
      node.records.push(r)
    }
  }
  const level = [...byKey.values()]
  if (dim.sortChildren) level.sort(dim.sortChildren)
  if (parent) parent.children = level
  return level
}

export function regroupNode<R>(node: SGNode<R>, dim: DimInput<R>, opts: GroupOpts<R> = {}): SGNode<R>[] {
  const [nd] = normalizeDims([dim])
  node.children = []
  const prefix = node.synthetic ? '' : `${node.id}/`
  return groupLevel(node.records, nd!, node, node.ctx, node.depth + 1, prefix, opts)
}

export function supergroup<R>(
  records: R[],
  dims: DimInput<R> | DimInput<R>[],
  opts: GroupOpts<R> = {},
): Supergroup<R> {
  const nd = normalizeDims(Array.isArray(dims) ? dims : [dims])
  const ctx: SGContext = { totalRecords: records.length }
  const root = opts.root === 'synthetic'
    ? new SGNode<R>({ id: '(root)', key: null, label: 'root', records: [...records], synthetic: true, ctx })
    : undefined
  const build = (parent: SGNode<R> | null, recs: R[], i: number, depth: number, prefix: string): SGNode<R>[] => {
    if (i >= nd.length) return []
    const level = groupLevel(recs, nd[i]!, parent, ctx, depth, prefix, opts)
    for (const n of level) build(n, n.records, i + 1, depth + 1, `${n.id}/`)
    return level
  }
  const roots = build(root ?? null, records, 0, root ? 1 : 0, '')
  return new Supergroup(roots, { root, ctx })
}
