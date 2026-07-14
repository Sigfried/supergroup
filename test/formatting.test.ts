import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/index.js'
import { prettyPrint, summary, toTable } from '../src/formatting/index.js'

const recs = [
  { c: 'US', s: 'Swim', n: 2 },
  { c: 'US', s: 'Swim', n: 1 },
  { c: 'US', s: 'Dive', n: 3 },
  { c: 'RU', s: 'Gym', n: 5 },
]
const sg = () => supergroup(recs, ['c', 's'])

describe('prettyPrint', () => {
  it('prints every node by default (no truncation, no header)', () => {
    const out = prettyPrint(sg())
    expect(out).toBe([
      'US (3 recs)',
      '  Swim (2 recs)',
      '  Dive (1 recs)',
      'RU (1 recs)',
      '  Gym (1 recs)',
    ].join('\n'))
  })
  it('maxDepth cuts with an explicit marker', () => {
    const out = prettyPrint(sg(), { maxDepth: 1 })
    expect(out).toBe([
      'US (3 recs)',
      '  … 2 children',
      'RU (1 recs)',
      '  … 1 child',
    ].join('\n'))
  })
  it('maxChildren cuts with an explicit count', () => {
    const out = prettyPrint(sg(), { maxChildren: 1 })
    expect(out.split('\n')).toContain('  … 1 more')
  })
  it('fmt overrides the node line', () => {
    const out = prettyPrint(sg(), { fmt: n => String(n.label).toLowerCase() })
    expect(out.split('\n')[0]).toBe('us')
  })
  it('rails style', () => {
    const out = prettyPrint(sg(), { rails: true })
    expect(out.split('\n')[1]).toBe('├─ Swim (2 recs)')
    expect(out.split('\n')[2]).toBe('└─ Dive (1 recs)')
  })
  it('accepts a single node and a node array', () => {
    const c = sg()
    expect(prettyPrint(c.roots[0]!)).toMatch(/^US/)
    expect(prettyPrint(c.roots)).toMatch(/\nRU/)
  })
})

describe('summary', () => {
  it('collection shape line', () => {
    expect(summary(sg())).toBe('2 roots · 5 nodes · 4 records')
  })
  it('node shape line', () => {
    expect(summary(sg().roots[0]!)).toBe('1 root · 3 nodes · 3 records')
  })
})

describe('toTable', () => {
  it('aligned text table, complete by default', () => {
    const out = toTable(recs)
    const lines = out.split('\n')
    expect(lines[0]).toBe('c   s     n')
    expect(lines[1]).toBe('──  ────  ─')
    expect(lines).toHaveLength(2 + recs.length) // header + rule + rows
    expect(lines[2]).toBe('US  Swim  2')
  })
  it('maxRows truncates explicitly', () => {
    const out = toTable(recs, { maxRows: 2 })
    expect(out).toContain('… 2 more rows (4 total)')
  })
  it('columns selects and orders', () => {
    expect(toTable(recs, { columns: ['n', 'c'] }).split('\n')[0]).toBe('n  c')
  })
})
