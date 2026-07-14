import { buildDag, type DagItem } from './build'
import { computeMetrics } from './metrics'
import { attachRecords } from './records'
import type { Supergroup } from '../collection'

export interface DagRecordOpts<R> {
  records?: R[]
  recordKey?: (r: R) => string | string[] | null | undefined
}

export function fromParentIds<R>(items: DagItem[], opts: DagRecordOpts<R> = {}): Supergroup<R> {
  const sg = buildDag<R>(items)
  computeMetrics(sg)
  if (opts.records && opts.recordKey) attachRecords(sg, opts.records, opts.recordKey)
  return sg
}

export function fromEdges<R>(
  edges: [string, string][],
  nodes?: { id: string; name?: string }[],
  opts: DagRecordOpts<R> = {},
): Supergroup<R> {
  const items = new Map<string, DagItem>()
  for (const n of nodes ?? []) items.set(n.id, { id: n.id, name: n.name, parentIds: [] })
  const ensure = (id: string): DagItem => {
    let it = items.get(id)
    if (!it) { it = { id, parentIds: [] }; items.set(id, it) }
    return it
  }
  for (const [pid, cid] of edges) {
    ensure(pid)
    ensure(cid).parentIds!.push(pid)
  }
  return fromParentIds<R>([...items.values()], opts)
}

export function fromParentChild<R, Row>(
  rows: Row[],
  opts: {
    parent: string | ((row: Row) => unknown)
    child: string | ((row: Row) => unknown)
    label?: string | ((row: Row) => string)
  },
  recordOpts: DagRecordOpts<R> = {},
): Supergroup<R> {
  const col = <T>(spec: string | ((row: Row) => T)) =>
    typeof spec === 'string' ? (row: Row) => (row as Record<string, unknown>)[spec] as T : spec
  const parentOf = col(opts.parent)
  const childOf = col(opts.child)
  // label conflicts are last-write-wins: when multiple rows name the same
  // child with different labels, the last row's label sticks
  const labelOf = opts.label ? col(opts.label) : undefined
  const items = new Map<string, DagItem>()
  const ensure = (id: string): DagItem => {
    let it = items.get(id)
    if (!it) { it = { id, parentIds: [] }; items.set(id, it) }
    return it
  }
  for (const row of rows) {
    const cid = String(childOf(row))
    const it = ensure(cid)
    if (labelOf) it.name = String(labelOf(row))
    const pRaw = parentOf(row)
    if (pRaw == null || pRaw === '') continue
    const pid = String(pRaw)
    ensure(pid)
    it.parentIds!.push(pid)
  }
  return fromParentIds<R>([...items.values()], recordOpts)
}
