import { describe, it, expect } from 'vitest'
import { compare } from '../src/compare/index'
import { supergroup } from '../src/group'
import { fromParentIds } from '../src/dag/constructors'
import { groupBySequence } from '../src/sequence/index'
import { makeTimelines, TL, type Evt } from './seq-fixtures'
import { RXS, type Rx } from './fixtures'

// b: drop SNOMED, add LOINC, add one RxNorm Drug record
const RXS_B: Rx[] = [
  ...RXS.filter(r => r.vocab === 'RxNorm'),
  { vocab: 'RxNorm', domain: 'Drug', name: 'heparin', cost: 20 },
  { vocab: 'LOINC', domain: 'Lab', name: 'a1c', cost: 5 },
]

describe('compare (by path)', () => {
  const sg = compare(supergroup(RXS, ['vocab', 'domain']), supergroup(RXS_B, ['vocab', 'domain']))

  it('classifies roots as a / b / both with countDelta', () => {
    expect(sg.roots.map(n => [n.label, n.cmp!.in])).toEqual([
      ['RxNorm', 'both'], ['SNOMED', 'a'], ['LOINC', 'b'],
    ])
    expect(sg.node('RxNorm')!.cmp!.countDelta).toBe(1)      // 3 -> 4
    expect(sg.node('SNOMED')!.cmp!.countDelta).toBe(-2)     // 2 -> 0
    expect(sg.node('LOINC')!.cmp!.countDelta).toBe(1)
  })
  it('recurses: children merge by key with side links', () => {
    const drug = sg.node('RxNorm/Drug')!
    expect(drug.cmp!.in).toBe('both')
    expect(drug.records).toHaveLength(3)                    // identity union: aspirin+warfarin shared, +heparin
    expect(drug.cmp!.a!.records).toHaveLength(2)
    expect(drug.cmp!.b!.records).toHaveLength(3)
    expect(sg.node('SNOMED/Condition')!.cmp!.in).toBe('a')
  })
  it('merged collection is a normal Supergroup (paths, depth, nodes)', () => {
    expect(sg.node('RxNorm/Drug')!.depth).toBe(1)
    expect(sg.node('RxNorm/Drug')!.namePath()).toBe('RxNorm/Drug')
    expect(sg.nodes.length).toBeGreaterThan(5)
  })
})

describe('compare (by id, dag)', () => {
  const DIAMOND = [
    { id: 'A' }, { id: 'B', parentIds: ['A'] },
    { id: 'C', parentIds: ['A'] }, { id: 'D', parentIds: ['B', 'C'] },
  ]
  const NO_C = [
    { id: 'A' }, { id: 'B', parentIds: ['A'] }, { id: 'D', parentIds: ['B'] },
  ]

  it('multi-parent nodes merge once, membership per node', () => {
    const sg = compare(fromParentIds(DIAMOND), fromParentIds(NO_C), { by: 'id' })
    const byId = new Map(sg.nodes.map(n => [n.id, n]))
    expect(sg.nodes).toHaveLength(4)                      // A, B, C, D — D once
    expect(byId.get('A/B/D'), 'id-mode uses source ids, not paths').toBeUndefined()
    expect(byId.get('D')!.cmp!.in).toBe('both')
    expect(byId.get('C')!.cmp!.in).toBe('a')
    expect(byId.get('D')!.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
  })
})

describe('compare regressions (final review)', () => {
  it('id mode pairs globally: differing parentage does not drop side b', () => {
    const a = fromParentIds([
      { id: 'A' }, { id: 'B', parentIds: ['A'] }, { id: 'D', parentIds: ['B'] },
    ])
    const b = fromParentIds([
      { id: 'A' }, { id: 'C', parentIds: ['A'] }, { id: 'D', parentIds: ['C'] },
    ])
    const sg = compare(a, b, { by: 'id' })
    const byId = new Map(sg.nodes.map(n => [n.id, n]))
    expect(byId.get('D')!.cmp!.in).toBe('both')
    expect(byId.get('B')!.cmp!.in).toBe('a')
    expect(byId.get('C')!.cmp!.in).toBe('b')
    expect(byId.get('D')!.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
  })
  it('duplicate match keys within one side throw (anchored-both collections)', () => {
    const all = makeTimelines(TL)
    const anchors = all.filter(e => e.evt === 'B')
    const mk = () => groupBySequence(anchors, {
      key: (e: Evt) => e.evt, next: e => e.next, prev: e => e.prev, direction: 'both',
    })
    expect(() => compare(mk(), mk())).toThrow(/duplicate match key/)
  })
  it('merged nodes keep direction: temporal paths survive compare', () => {
    const all = makeTimelines(TL)
    const ends = all.filter(e => !e.next)
    const mk = () => groupBySequence(ends, {
      key: (e: Evt) => e.evt, prev: e => e.prev, direction: 'backward',
    })
    const sg = compare(mk(), mk())
    expect(sg.node(['C', 'B', 'A'])!.namePath()).toBe('A/B/C')
  })
  it('records union: comparing collections over the same records does not double-count', () => {
    const sg = compare(supergroup(RXS, ['vocab']), supergroup(RXS, ['vocab']))
    expect(sg.node('RxNorm')!.records).toHaveLength(3)
    expect(sg.node('RxNorm')!.cmp!.countDelta).toBe(0)
  })
})
