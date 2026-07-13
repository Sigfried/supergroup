import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'
import { groupLevel } from '../group'
import { normalizeDims } from '../dims'

export interface SequenceOpts<R> {
  key: string | ((r: R) => unknown)
  next?: (r: R) => R | null | undefined
  prev?: (r: R) => R | null | undefined
  direction: 'forward' | 'backward' | 'both'
  maxDepth?: number
}

export function groupBySequence<R>(startRecords: R[], opts: SequenceOpts<R>): Supergroup<R> {
  const { direction } = opts
  if ((direction === 'forward' || direction === 'both') && !opts.next)
    throw new Error(`direction '${direction}' requires a next accessor`)
  if ((direction === 'backward' || direction === 'both') && !opts.prev)
    throw new Error(`direction '${direction}' requires a prev accessor`)
  const [dim] = normalizeDims<R>([opts.key])
  const ctx: SGContext = { totalRecords: startRecords.length }
  const maxDepth = opts.maxDepth ?? Infinity

  // Build one direction's tree: level 0 groups startRecords; level n+1
  // groups each node's records' successors (the lifeflow pattern).
  const buildDirection = (
    dirn: 'forward' | 'backward',
    step: (r: R) => R | null | undefined,
    idPrefix: string,
    baseDepth: number,
  ): SGNode<R>[] => {
    const grow = (node: SGNode<R>): void => {
      if (node.depth - baseDepth >= maxDepth) return
      const successors: R[] = []
      for (const r of node.records) {
        const s = step(r)
        if (s != null) successors.push(s)
      }
      if (!successors.length) return
      const kids = groupLevel(successors, dim!, node, ctx, node.depth + 1, `${node.id}/`, {})
      for (const k of kids) {
        k.direction = dirn
        grow(k)
      }
    }
    const level0 = groupLevel(startRecords, dim!, null, ctx, baseDepth, idPrefix, {})
    for (const n of level0) {
      n.direction = dirn
      grow(n)
    }
    return level0
  }

  if (direction === 'both') {
    const root = new SGNode<R>({
      id: '(root)', key: null, label: 'root', records: [...startRecords], synthetic: true, ctx,
    })
    const fwd = buildDirection('forward', opts.next!, '+', 1)
    const bwd = buildDirection('backward', opts.prev!, '-', 1)
    root.children = [...fwd, ...bwd]
    for (const n of root.children) n.parents.push(root)
    return new Supergroup(root.children, { root, ctx })
  }

  const step = direction === 'forward' ? opts.next! : opts.prev!
  const roots = buildDirection(direction, step, '', 0)
  return new Supergroup(roots, { ctx })
}
