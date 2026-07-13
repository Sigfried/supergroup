import { describe, it, expect } from 'vitest'
import { groupBySequence } from '../src/sequence/index'
import { makeTimelines, TL, type Evt } from './seq-fixtures'

describe('groupBySequence forward', () => {
  const all = makeTimelines(TL)
  const starts = all.filter(e => !e.prev)
  const sg = groupBySequence(starts, {
    key: (e: Evt) => e.evt, next: e => e.next, direction: 'forward',
  })

  it('level 0 groups start records by key', () => {
    expect(sg.roots.map(n => [n.label, n.records.length])).toEqual([['A', 2], ['B', 1]])
    expect(sg.roots[0]!.direction).toBe('forward')
    expect(sg.roots[0]!.depth).toBe(0)
  })
  it("each level groups the records' successors", () => {
    const a = sg.roots[0]!
    expect(a.children.map(n => [n.label, n.records.length])).toEqual([['B', 1], ['C', 1]])
    expect(sg.node('A/B/C')!.records).toHaveLength(1)
    expect(sg.node('A/B/C')!.namePath()).toBe('A/B/C')
  })
  it('records without a successor fall out of the next level', () => {
    // timeline e3 is B->C; C has no next, so B's subtree ends at C
    expect(sg.node('B/C')!.children).toEqual([])
  })
  it('throws when the required accessor is missing', () => {
    expect(() => groupBySequence(starts, { key: (e: Evt) => e.evt, direction: 'forward' }))
      .toThrow(/requires a next accessor/)
  })
})

describe('groupBySequence backward', () => {
  const all = makeTimelines(TL)
  const ends = all.filter(e => !e.next)
  const sg = groupBySequence(ends, {
    key: (e: Evt) => e.evt, prev: e => e.prev, direction: 'backward',
  })

  it('groups predecessors level by level', () => {
    expect(sg.roots.map(n => [n.label, n.records.length])).toEqual([['C', 3]])
    const c = sg.roots[0]!
    expect(c.children.map(n => [n.label, n.records.length])).toEqual([['B', 2], ['A', 1]])
    expect(c.direction).toBe('backward')
  })
  it('path/namePath are temporal (reversed); pedigree stays structural', () => {
    const cba = sg.node(['C', 'B', 'A'])!
    expect(cba.pedigree().map(n => n.label)).toEqual(['C', 'B', 'A'])
    expect(cba.namePath()).toBe('A/B/C')
    expect(cba.path()).toEqual(['A', 'B', 'C'])
  })
})

describe('groupBySequence both + maxDepth', () => {
  const all = makeTimelines(TL)

  it("'both' hangs a forward and a backward tree under one synthetic root", () => {
    const anchors = all.filter(e => e.evt === 'B')
    const sg = groupBySequence(anchors, {
      key: (e: Evt) => e.evt, next: e => e.next, prev: e => e.prev, direction: 'both',
    })
    expect(sg.root!.synthetic).toBe(true)
    expect(sg.root!.children.map(c => [c.id, c.direction])).toEqual([
      ['+B', 'forward'], ['-B', 'backward'],
    ])
    expect(sg.select(['+B/C'])[0]!.records).toHaveLength(2)
    expect(sg.select(['-B/A'])[0]!.records).toHaveLength(1)
    expect(sg.select(['-B/A'])[0]!.namePath()).toBe('A/B')
  })
  it('maxDepth stops growth at the given relative depth', () => {
    const starts = all.filter(e => !e.prev)
    const sg = groupBySequence(starts, {
      key: (e: Evt) => e.evt, next: e => e.next, direction: 'forward', maxDepth: 1,
    })
    expect(sg.node('A/B')).toBeDefined()
    expect(sg.node('A/B')!.children).toEqual([])
    expect(sg.node('A/B/C')).toBeUndefined()
  })
})
