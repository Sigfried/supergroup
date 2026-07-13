import { describe, it, expect } from 'vitest'
import { toD3 } from '../src/adapters/d3'
import { fromParentIds } from '../src/dag/constructors'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

const DIAMOND = [
  { id: 'A' }, { id: 'B', parentIds: ['A'] },
  { id: 'C', parentIds: ['A'] }, { id: 'D', parentIds: ['B', 'C'] },
]

describe('toD3', () => {
  it('multi-root grouped tree gets a wrapper root', () => {
    const out = toD3(supergroup(RXS, ['vocab', 'domain']))
    expect(out.id).toBe('(root)')
    expect(out.children!.map(c => c.name)).toEqual(['RxNorm', 'SNOMED'])
    expect(out.children![0]!.children!.map(c => c.name)).toEqual(['Drug', 'Procedure'])
    expect(out.children![0]!.records).toHaveLength(3)
  })
  it('firstOccurrence keeps one copy of a multi-parent node', () => {
    const out = toD3(fromParentIds(DIAMOND))
    const a = out.children![0]!
    const [b, c] = a.children!
    expect(b!.children!.map(n => n.id)).toEqual(['D'])
    expect(c!.children).toBeUndefined()
  })
  it('repeat duplicates the subtree per parent', () => {
    const out = toD3(fromParentIds(DIAMOND), { onRepeat: 'repeat' })
    const a = out.children![0]!
    expect(a.children![0]!.children!.map(n => n.id)).toEqual(['D'])
    expect(a.children![1]!.children!.map(n => n.id)).toEqual(['D'])
  })
  it('accepts a single node as target', () => {
    const sg = supergroup(RXS, ['vocab', 'domain'])
    const out = toD3(sg.roots[0]!)
    expect(out.name).toBe('RxNorm')
    expect(out.children!.map(c => c.name)).toEqual(['Drug', 'Procedure'])
  })
})
