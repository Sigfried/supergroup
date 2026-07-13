import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

describe('multi-level grouping', () => {
  it('nests levels with path ids and increasing depth', () => {
    const sg = supergroup(RXS, ['vocab', 'domain'])
    const rx = sg.roots[0]!
    expect(rx.children.map(c => c.label)).toEqual(['Drug', 'Procedure'])
    const drug = rx.children[0]!
    expect(drug.id).toBe('RxNorm/Drug')
    expect(drug.depth).toBe(1)
    expect(drug.dim).toBe('domain')
    expect(drug.parents).toEqual([rx])
    expect(drug.records).toHaveLength(2)
    expect(sg.nodes).toHaveLength(2 + 4)   // 2 vocabs + 4 domain groups
  })
  it('synthetic root holds all records and heads sg.nodes', () => {
    const sg = supergroup(RXS, ['vocab'], { root: 'synthetic' })
    expect(sg.root!.id).toBe('(root)')
    expect(sg.root!.records).toHaveLength(RXS.length)
    expect(sg.root!.depth).toBe(0)
    expect(sg.roots[0]!.depth).toBe(1)
    expect(sg.roots[0]!.parents).toEqual([sg.root])
    expect(sg.nodes[0]).toBe(sg.root)
  })
})
