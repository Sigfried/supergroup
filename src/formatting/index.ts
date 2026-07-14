import type { SGNode } from '../node.js'
import { Supergroup } from '../collection.js'
import { recordsUnder } from '../selection.js'

export interface PrettyPrintOpts<R> {
  /** levels shown; omitted = all */
  maxDepth?: number
  /** children listed per node; omitted = all */
  maxChildren?: number
  /** per-node line; default: label + record count + cmp when present */
  fmt?: (n: SGNode<R>) => string
  /** box-drawing rails instead of plain two-space indentation */
  rails?: boolean
}

const num = (n: number) => n.toLocaleString('en-US')

const defaultFmt = <R>(n: SGNode<R>): string => {
  let s = `${n.label} (${num(n.records.length)} recs)`
  if (n.cmp) s += ` [${n.cmp.in}${n.cmp.countDelta ? ` Δ${num(n.cmp.countDelta)}` : ''}]`
  return s
}

type Printable<R> = Supergroup<R> | SGNode<R> | SGNode<R>[]

const rootsOf = <R>(x: Printable<R>): SGNode<R>[] =>
  x instanceof Supergroup ? (x.root ? [x.root] : x.roots)
  : Array.isArray(x) ? x : [x]

export function prettyPrint<R>(x: Printable<R>, opts: PrettyPrintOpts<R> = {}): string {
  const { maxDepth, maxChildren, fmt = defaultFmt, rails = false } = opts
  const lines: string[] = []
  const walk = (n: SGNode<R>, depth: number, prefix: string, childIndent: string, onPath: Set<SGNode<R>>) => {
    if (onPath.has(n)) { lines.push(`${prefix}↻ ${n.label} (cycle)`); return }
    lines.push(prefix + fmt(n))
    if (maxDepth !== undefined && depth + 1 >= maxDepth) {
      const k = n.children.length
      if (k) lines.push(`${childIndent}${rails ? '└─ ' : ''}… ${num(k)} ${k === 1 ? 'child' : 'children'}`)
      return
    }
    const shown = maxChildren !== undefined ? n.children.slice(0, maxChildren) : n.children
    const hidden = n.children.length - shown.length
    onPath.add(n)
    shown.forEach((c, i) => {
      const last = i === shown.length - 1 && hidden === 0
      const cPrefix = rails ? childIndent + (last ? '└─ ' : '├─ ') : childIndent
      const cIndent = rails ? childIndent + (last ? '   ' : '│  ') : childIndent + '  '
      walk(c, depth + 1, cPrefix, cIndent, onPath)
    })
    onPath.delete(n)
    if (hidden > 0) lines.push(`${childIndent}${rails ? '└─ ' : ''}… ${num(hidden)} more`)
  }
  for (const r of rootsOf(x)) walk(r, 0, '', rails ? '' : '  ', new Set())
  return lines.join('\n')
}

export function summary<R>(x: Printable<R>): string {
  const roots = rootsOf(x)
  let nodeCount: number
  if (x instanceof Supergroup) nodeCount = x.nodes.length
  else {
    const seen = new Set<SGNode<R>>(roots)
    for (const r of roots) for (const d of r.descendants()) seen.add(d)
    nodeCount = seen.size
  }
  const records = recordsUnder(roots).length
  return `${num(roots.length)} root${roots.length === 1 ? '' : 's'} · ${num(nodeCount)} nodes · ${num(records)} records`
}

export interface ToTableOpts {
  /** rows shown; omitted = all */
  maxRows?: number
  /** column selection + order; default: keys of the first record */
  columns?: string[]
}

export function toTable(records: readonly object[], opts: ToTableOpts = {}): string {
  if (!records.length) return '(no records)'
  const cols = opts.columns ?? Object.keys(records[0]!)
  const rows = opts.maxRows !== undefined ? records.slice(0, opts.maxRows) : records
  const cell = (v: unknown): string =>
    v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
  const grid = rows.map(r => cols.map(c => cell((r as Record<string, unknown>)[c])))
  const widths = cols.map((c, i) => Math.max(c.length, ...grid.map(g => g[i]!.length)))
  const line = (cells: string[]) => cells.map((s, i) => s.padEnd(widths[i]!)).join('  ').trimEnd()
  const out = [line(cols), line(widths.map(w => '─'.repeat(w))), ...grid.map(line)]
  if (rows.length < records.length)
    out.push(`… ${num(records.length - rows.length)} more rows (${num(records.length)} total)`)
  return out.join('\n')
}
