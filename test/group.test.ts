import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

describe('supergroup() single dim', () => {
  it('groups records by a string dim, preserving first-seen order', () => {
    const sg = supergroup(RXS, ['vocab'])
    expect(sg.roots.map(n => n.label)).toEqual(['RxNorm', 'SNOMED'])
    expect(sg.roots[0]!.records).toHaveLength(3)
    expect(sg.roots[0]!.dim).toBe('vocab')
    expect(sg.roots[0]!.depth).toBe(0)
    expect(sg.roots[0]!.id).toBe('RxNorm')
    expect(String(sg.roots[0])).toBe('RxNorm')       // toString()
    expect(sg.nodes).toHaveLength(2)
    expect(sg.flatten()).toBe(sg.nodes)
  })
  it('groups Date keys by value, not identity (the es6-branch fix)', () => {
    const recs = [{ d: new Date(2020, 0, 1) }, { d: new Date(2020, 0, 1) }]
    const sg = supergroup(recs, [(r: { d: Date }) => r.d])
    expect(sg.roots).toHaveLength(1)
    expect(sg.roots[0]!.key).toBeInstanceOf(Date)
    expect(sg.roots[0]!.records).toHaveLength(2)
  })
  it('invalid Dates do not crash grouping and bucket together', () => {
    const recs = [{ d: new Date('nope') }, { d: new Date(NaN) }]
    const sg = supergroup(recs, [(r: { d: Date }) => r.d])
    expect(sg.roots).toHaveLength(1)
    expect(sg.roots[0]!.records).toHaveLength(2)
  })
  it('excludeValues skips keys', () => {
    const sg = supergroup(RXS, ['vocab'], { excludeValues: ['SNOMED'] })
    expect(sg.roots.map(n => n.label)).toEqual(['RxNorm'])
  })
  it('multi dims put one record in several sibling groups', () => {
    const recs = [{ tags: ['a', 'b'] }, { tags: ['b'] }]
    const sg = supergroup(recs, [{ by: 'tags', name: 'tag', multi: true }])
    expect(sg.roots.map(n => String(n.key)).sort()).toEqual(['a', 'b'])
    expect(sg.roots.find(n => n.key === 'b')!.records).toHaveLength(2)
  })
  it('sortChildren orders a level', () => {
    const sg = supergroup(RXS, [{ by: 'domain', sortChildren: (a, b) => b.records.length - a.records.length }])
    expect(sg.roots.map(n => n.label)).toEqual(['Drug', 'Procedure', 'Condition'])
  })
})

describe('supergroup() multi-dim', () => {
  it('multi-dim grouping', () => {
    const sg = supergroup(RXS, ['vocab', 'domain'])
    expect(sg.node('b')).toBeUndefined()
    expect(sg.node('RxNorm/Drug')!.records).toHaveLength(2)
  })
})
