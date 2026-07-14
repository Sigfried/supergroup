import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { subgraph } from '../src/dag/subgraph'
import { supergroup } from '../src/group'
import { toDagBrowserNodes } from '../src/adapters/dagBrowser'
import { DAG_ITEMS, RXS } from './fixtures'

describe('toDagBrowserNodes', () => {
  it('emits {id, name, parentIds} with backedges re-included', () => {
    const out = toDagBrowserNodes(fromParentIds(DAG_ITEMS))
    const byId = new Map(out.map(n => [n.id, n]))
    expect(out).toHaveLength(7)
    expect(byId.get('D')!.parentIds.sort()).toEqual(['B', 'C'])
    expect(byId.get('E')!.parentIds.sort()).toEqual(['B', 'E'])   // self-loop restored
    expect(byId.get('F')!.parentIds).toEqual(['G'])               // cycle edge restored
    expect(byId.get('A')!.parentIds).toEqual([])
    expect(byId.get('A')!.name).toBe('Alpha')
  })
  it('works on grouped trees (path ids) and skips synthetic roots', () => {
    const out = toDagBrowserNodes(supergroup(RXS, ['vocab', 'domain'], { root: 'synthetic' }))
    expect(out.find(n => n.id === '(root)')).toBeUndefined()
    expect(out.find(n => n.id === 'RxNorm')!.parentIds).toEqual([])
    expect(out.find(n => n.id === 'RxNorm/Drug')!.parentIds).toEqual(['RxNorm'])
  })
  it('end-to-end: toDagBrowserNodes(subgraph(fromParentIds(...)))', () => {
    const items = [
      { id: 'Study', parentIds: [] },
      { id: 'Participant', parentIds: ['Study'] },
      { id: 'Visit', parentIds: ['Study', 'Participant'] },
      { id: 'Specimen', parentIds: ['Visit', 'Participant'] },
      { id: 'Doc', parentIds: ['Doc', 'Study'] },       // self-loop → backedge
    ]
    const sub = subgraph(fromParentIds(items), ['Study', 'Participant', 'Specimen', 'Doc'])
    const nodes = toDagBrowserNodes(sub)
    expect(nodes.map(n => n.id).sort()).toEqual(['Doc', 'Participant', 'Specimen', 'Study'])
    expect(nodes.find(n => n.id === 'Specimen')!.parentIds).toEqual(['Participant'])
    expect(nodes.find(n => n.id === 'Doc')!.parentIds.sort()).toEqual(['Doc', 'Study'])
  })
})
