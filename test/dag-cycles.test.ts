import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { DAG_ITEMS } from './fixtures'

describe('cycle discipline', () => {
  const sg = fromParentIds(DAG_ITEMS)

  it('nothing vanishes: all 7 nodes present', () => {
    expect(sg.nodes).toHaveLength(7)
  })
  it('self-loop on E is a backedge, not a parent', () => {
    const e = sg.select(['E'])[0]!
    expect(e.parents.map(p => p.id)).toEqual(['B'])
    expect(sg.backedges.some(b => b.parent.id === 'E' && b.child.id === 'E')).toBe(true)
  })
  it('rootless cycle F<->G: F promoted to root, G→F edge kept, F→... backedge recorded', () => {
    expect(sg.roots.map(r => r.id)).toEqual(['A', 'F'])
    const g = sg.select(['G'])[0]!
    expect(g.parents.map(p => p.id)).toEqual(['F'])
    expect(sg.backedges.some(b => b.parent.id === 'G' && b.child.id === 'F')).toBe(true)
  })
  it('traversals terminate and dedup on cyclic input', () => {
    const f = sg.select(['F'])[0]!
    expect(f.descendants().map(n => n.id)).toEqual(['G'])
    expect(f.ancestors()).toEqual([])
  })
})
