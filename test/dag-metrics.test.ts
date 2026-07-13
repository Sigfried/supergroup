import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'

// A→B→C→D and A→D shortcut: D minDepth 1, maxDepth 3
const ITEMS = [
  { id: 'A' },
  { id: 'B', parentIds: ['A'] },
  { id: 'C', parentIds: ['B'] },
  { id: 'D', parentIds: ['C', 'A'] },
]

describe('dag metrics', () => {
  const sg = fromParentIds(ITEMS)
  const get = (id: string) => sg.select([id])[0]!

  it('maxDepth is the longest path from a root', () => {
    expect(get('D').depth).toBe(1)
    expect(get('D').maxDepth).toBe(3)
    expect(get('A').maxDepth).toBe(0)
  })
  it('height is the longest path down to a leaf', () => {
    expect(get('A').height).toBe(3)
    expect(get('D').height).toBe(0)
  })
})
