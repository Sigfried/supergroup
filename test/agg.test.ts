import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/group'
import { recordsFor, recordsUnder } from '../src/selection'
import { RXS } from './fixtures'

describe('aggregates and selection', () => {
  const sg = supergroup(RXS, ['vocab', 'domain'])
  const rx = sg.roots[0]!             // RxNorm: costs 2, 10, 50
  const drug = rx.children[0]!        // RxNorm/Drug: costs 2, 10

  it('agg over own records', () => {
    expect(drug.agg(r => r.cost)).toEqual({ count: 2, sum: 12, mean: 6, min: 2, max: 10 })
  })
  it('pct is share of ALL records in the collection', () => {
    expect(rx.pct()).toBeCloseTo(3 / 5)
  })
  it('recordsFor unions without double-counting shared records', () => {
    // rx's records are a superset of drug's: union must not double-count
    expect(recordsFor([rx, drug])).toHaveLength(3)
  })
  it('recordsUnder includes descendants, deduped', () => {
    expect(recordsUnder([rx])).toHaveLength(3)
  })
  it('rollup = union-then-aggregate', () => {
    expect(rx.rollup(r => r.cost)).toEqual({ count: 3, sum: 62, mean: 62 / 3, min: 2, max: 50 })
    expect(rx.rollup()).toEqual({ count: 3 })
  })
  it('rollup distinct counts unique key values over the union', () => {
    expect(rx.rollup({ distinct: r => r.cost })).toEqual({ count: 3, distinct: 3 })
    expect(rx.rollup({ value: r => r.cost, distinct: r => r.cost }))
      .toEqual({ count: 3, sum: 62, mean: 62 / 3, min: 2, max: 50, distinct: 3 })
  })
})
