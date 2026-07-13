import { describe, it, expect } from 'vitest'
import { fromEdges, fromParentChild } from '../src/dag/constructors'

describe('fromEdges', () => {
  it('builds from [parent, child] pairs, auto-creating nodes', () => {
    const sg = fromEdges([['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']])
    expect(sg.roots.map(r => r.id)).toEqual(['A'])
    expect(sg.select(['D'])[0]!.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
  })
  it('uses the nodes list for labels', () => {
    const sg = fromEdges([['a', 'b']], [{ id: 'a', name: 'Ay' }, { id: 'b', name: 'Bee' }])
    expect(sg.roots[0]!.label).toBe('Ay')
  })
})

describe('fromParentChild', () => {
  const ROWS = [
    { p: null, c: 'root1', nm: 'Root One' },
    { p: 'root1', c: 'kid', nm: 'Kid' },
    { p: 'root1', c: 'kid2', nm: 'Kid Two' },
    { p: 'kid', c: 'gk', nm: 'Grandkid' },
    { p: 'kid2', c: 'gk', nm: 'Grandkid' },     // polyhierarchy: gk under 2 parents
  ]
  it('builds a polyhierarchy from a parent/child table', () => {
    const sg = fromParentChild(ROWS, { parent: 'p', child: 'c', label: 'nm' })
    expect(sg.roots.map(r => r.id)).toEqual(['root1'])
    const gk = sg.select(['gk'])[0]!
    expect(gk.parents.map(p => p.id).sort()).toEqual(['kid', 'kid2'])
    expect(gk.label).toBe('Grandkid')
  })
})
