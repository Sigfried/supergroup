import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

describe('node navigation', () => {
  const sg = supergroup(RXS, ['vocab', 'domain'], { root: 'synthetic' })
  const rx = sg.roots[0]!            // RxNorm (depth 1)
  const drug = rx.children[0]!       // RxNorm/Drug

  it('ancestors dedups and excludes self', () => {
    expect(drug.ancestors()).toEqual(expect.arrayContaining([rx, sg.root]))
    expect(drug.ancestors()).toHaveLength(2)
  })
  it('descendants and leaves', () => {
    expect(rx.descendants().map(n => n.label).sort()).toEqual(['Drug', 'Procedure'])
    expect(rx.leaves().map(n => n.label).sort()).toEqual(['Drug', 'Procedure'])
    expect(drug.leaves()).toEqual([drug])
  })
  it('pedigree includes synthetic root; path/namePath exclude it', () => {
    expect(drug.pedigree()).toEqual([sg.root, rx, drug])
    expect(drug.path()).toEqual(['RxNorm', 'Drug'])
    expect(drug.namePath()).toBe('RxNorm/Drug')
    expect(drug.namePath(' > ')).toBe('RxNorm > Drug')
  })
})
