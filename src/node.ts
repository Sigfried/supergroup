import { recordsUnder } from './selection.js'
import { regroupNode, type GroupOpts } from './group.js'
import type { DimInput } from './dims.js'

export interface SGContext { totalRecords: number }

export interface Agg { count: number; sum: number; mean: number; min: number; max: number }

export interface CmpInfo<R> {
  in: 'a' | 'b' | 'both'
  a?: SGNode<R>
  b?: SGNode<R>
  countDelta: number
}

export interface SGNodeInit<R> {
  id: string
  key: unknown
  label: string
  dim?: string
  records?: R[]
  depth?: number
  synthetic?: boolean
  direction?: 'forward' | 'backward'
  ctx: SGContext
}

export class SGNode<R> {
  id: string
  key: unknown
  label: string
  dim?: string
  records: R[]
  parents: SGNode<R>[] = []
  children: SGNode<R>[] = []
  depth: number
  synthetic?: boolean
  direction?: 'forward' | 'backward'
  maxDepth?: number   // dag module fills these
  height?: number
  cmp?: CmpInfo<R>
  ctx: SGContext

  constructor(init: SGNodeInit<R>) {
    this.id = init.id
    this.key = init.key
    this.label = init.label
    this.dim = init.dim
    this.records = init.records ?? []
    this.depth = init.depth ?? 0
    this.synthetic = init.synthetic
    this.direction = init.direction
    this.ctx = init.ctx
  }

  toString(): string { return this.label }

  ancestors(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const stack = [...this.parents]
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      stack.push(...n.parents)
    }
    return out
  }

  descendants(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const stack = [...this.children]
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      stack.push(...n.children)
    }
    return out
  }

  leaves(): SGNode<R>[] {
    if (!this.children.length) return [this]
    return this.descendants().filter(n => !n.children.length)
  }

  pedigree(): SGNode<R>[] {
    const out: SGNode<R>[] = [this]
    let n: SGNode<R> = this
    while (n.parents[0]) { n = n.parents[0]; out.unshift(n) }
    return out
  }

  path(): unknown[] {
    const keys = this.pedigree().filter(n => !n.synthetic).map(n => n.key)
    if (this.direction === 'backward') keys.reverse()
    return keys
  }

  namePath(sep = '/'): string {
    const labels = this.pedigree().filter(n => !n.synthetic).map(n => n.label)
    if (this.direction === 'backward') labels.reverse()
    return labels.join(sep)
  }

  agg(accessor: (r: R) => number): Agg { return aggregate(this.records, accessor) }

  /**
   * Fraction of the collection's total records under this node. On dag
   * collections totalRecords is 0 until attachRecords runs (pct() = NaN),
   * and unmatched records still count in the denominator.
   */
  pct(): number { return this.records.length / this.ctx.totalRecords }

  /** union-then-aggregate over this node and all descendants; never sum-over-paths */
  rollup(accessor?: (r: R) => number): { count: number } & Partial<Agg> {
    const recs = recordsUnder([this])
    return accessor ? aggregate(recs, accessor) : { count: recs.length }
  }

  groupChildren(dim: DimInput<R>, opts?: GroupOpts<R>): SGNode<R>[] {
    return regroupNode(this, dim, opts)
  }
}

function aggregate<R>(records: R[], accessor: (r: R) => number): Agg {
  let sum = 0, min = Infinity, max = -Infinity
  for (const r of records) {
    const v = accessor(r)
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  const count = records.length
  return { count, sum, mean: count ? sum / count : NaN, min: count ? min : NaN, max: count ? max : NaN }
}
