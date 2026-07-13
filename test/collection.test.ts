import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

describe('collection lookup and select', () => {
  const sg = supergroup(RXS, ['vocab', 'domain'])

  it('node() walks a path string or key array', () => {
    expect(sg.node('RxNorm/Drug')!.records).toHaveLength(2)
    expect(sg.node(['RxNorm', 'Drug'])).toBe(sg.node('RxNorm/Drug'))
    expect(sg.node('RxNorm/Nope')).toBeUndefined()
  })
  it('select() by predicate and by id/key list', () => {
    expect(sg.select(n => n.records.length >= 3).map(n => n.label)).toEqual(['RxNorm'])
    expect(sg.select(['RxNorm/Drug', 'SNOMED']).map(n => n.id).sort())
      .toEqual(['RxNorm/Drug', 'SNOMED'])
  })
  it('groupChildren regroups a node and reindex() refreshes nodes', () => {
    const sg2 = supergroup(RXS, ['vocab'])
    const rx = sg2.roots[0]!
    const before = sg2.nodes.length            // 2
    const kids = rx.groupChildren('domain')
    expect(kids.map(k => k.id)).toEqual(['RxNorm/Drug', 'RxNorm/Procedure'])
    expect(kids[0]!.depth).toBe(1)
    expect(sg2.nodes).toHaveLength(before)     // stale until reindex
    sg2.reindex()
    expect(sg2.nodes).toHaveLength(before + 2)
  })
})
