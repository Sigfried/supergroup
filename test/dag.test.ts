import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'

const ACYCLIC = [
  { id: 'A', name: 'Alpha' },
  { id: 'B', name: 'Beta', parentIds: ['A'] },
  { id: 'C', name: 'Gamma', parentIds: ['A'] },
  { id: 'D', name: 'Delta', parentIds: ['B', 'C'] },
]

describe('fromParentIds (acyclic)', () => {
  const sg = fromParentIds(ACYCLIC)

  it('builds multi-parent structure', () => {
    const d = sg.node(['A', 'B', 'D'])!
    expect(d.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
    expect(d.label).toBe('Delta')
    expect(sg.roots.map(r => r.id)).toEqual(['A'])
  })
  it('each node appears once in sg.nodes', () => {
    expect(sg.nodes).toHaveLength(4)
  })
  it('depth is MIN depth from any root', () => {
    const withShortcut = fromParentIds([...ACYCLIC, { id: 'X', parentIds: ['A', 'D'] }])
    expect(withShortcut.select(['X'])[0]!.depth).toBe(1)
  })
  it('ignores unknown parent ids; throws on duplicate ids', () => {
    const sg2 = fromParentIds([{ id: 'A', parentIds: ['ghost'] }])
    expect(sg2.roots.map(r => r.id)).toEqual(['A'])
    expect(() => fromParentIds([{ id: 'A' }, { id: 'A' }])).toThrow(/duplicate/)
  })
})
