import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { attachRecords } from '../src/dag/records'
import { subgraph } from '../src/dag/subgraph'
import { supergroup } from '../src/group'
import { groupBySequence } from '../src/sequence'
import { DAG_ITEMS } from './fixtures'

describe('subgraph', () => {
  it('induces the sub-DAG over a node set', () => {
    const sg = fromParentIds(DAG_ITEMS)
    const sub = subgraph(sg, ['B', 'D', 'E'])
    expect(sub.nodes.map(n => n.id).sort()).toEqual(['B', 'D', 'E'])
    expect(sub.roots.map(r => r.id)).toEqual(['B'])          // A dropped → B is root
    expect(sub.select(['D'])[0]!.parents.map(p => p.id)).toEqual(['B'])  // C edge gone
    expect(sub.select(['D'])[0]!.depth).toBe(1)
    expect(sub.backedges.some(b => b.parent.id === 'E' && b.child.id === 'E')).toBe(true)
  })
  it('does not mutate the source and carries records', () => {
    const sg = fromParentIds<{ concept: string }>(DAG_ITEMS)
    attachRecords(sg, [{ concept: 'D' }], r => r.concept)
    const sub = subgraph(sg, ['B', 'D'])
    expect(sub.select(['D'])[0]!.records).toHaveLength(1)
    expect(sub.select(['B'])[0]!.rollup().count).toBe(1)
    expect(sg.nodes).toHaveLength(7)                          // source intact
    expect(sg.select(['D'])[0]!.parents).toHaveLength(2)
  })

  it('subgraph keeps synthetic flag and collection root', () => {
    const recs = [{ a: 'x' }, { a: 'y' }]
    const sg = supergroup(recs, ['a'], { root: 'synthetic' })
    const sub = subgraph(sg, ['(root)', 'x'])
    expect(sub.root).toBeDefined()
    expect(sub.root!.synthetic).toBe(true)
    expect(sub.root!.children.map(n => n.label)).toEqual(['x'])
    expect(sub.roots).toHaveLength(0)          // root is not doubled into roots
    expect(sub.nodes.map(n => n.id)).toEqual(['(root)', 'x'])
  })

  it('subgraph keeps node direction (backward paths stay reversed)', () => {
    type Evt = { name: string; prev?: Evt }
    const e1: Evt = { name: 'start' }
    const e2: Evt = { name: 'end', prev: e1 }
    const sg = groupBySequence([e2], { key: 'name', prev: e => e.prev, direction: 'backward' })
    const leaf = sg.nodes.find(n => n.label === 'start')!
    expect(leaf.namePath()).toBe('start/end')  // reversed because backward
    const sub = subgraph(sg, sg.nodes.map(n => n.id))
    const subLeaf = sub.nodes.find(n => n.label === 'start')!
    expect(subLeaf.direction).toBe('backward')
    expect(subLeaf.namePath()).toBe('start/end')
  })
})
