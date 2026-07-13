import { describe, it, expect } from 'vitest'
import { compare } from '../src/compare/index'
import { supergroup } from '../src/group'
import { RXS, type Rx } from './fixtures'

// b: drop SNOMED, add LOINC, add one RxNorm Drug record
const RXS_B: Rx[] = [
  ...RXS.filter(r => r.vocab === 'RxNorm'),
  { vocab: 'RxNorm', domain: 'Drug', name: 'heparin', cost: 20 },
  { vocab: 'LOINC', domain: 'Lab', name: 'a1c', cost: 5 },
]

describe('compare (by path)', () => {
  const sg = compare(supergroup(RXS, ['vocab', 'domain']), supergroup(RXS_B, ['vocab', 'domain']))

  it('classifies roots as a / b / both with countDelta', () => {
    expect(sg.roots.map(n => [n.label, n.cmp!.in])).toEqual([
      ['RxNorm', 'both'], ['SNOMED', 'a'], ['LOINC', 'b'],
    ])
    expect(sg.node('RxNorm')!.cmp!.countDelta).toBe(1)      // 3 -> 4
    expect(sg.node('SNOMED')!.cmp!.countDelta).toBe(-2)     // 2 -> 0
    expect(sg.node('LOINC')!.cmp!.countDelta).toBe(1)
  })
  it('recurses: children merge by key with side links', () => {
    const drug = sg.node('RxNorm/Drug')!
    expect(drug.cmp!.in).toBe('both')
    expect(drug.records).toHaveLength(5)                    // 2 from a + 3 from b
    expect(drug.cmp!.a!.records).toHaveLength(2)
    expect(drug.cmp!.b!.records).toHaveLength(3)
    expect(sg.node('SNOMED/Condition')!.cmp!.in).toBe('a')
  })
  it('merged collection is a normal Supergroup (paths, depth, nodes)', () => {
    expect(sg.node('RxNorm/Drug')!.depth).toBe(1)
    expect(sg.node('RxNorm/Drug')!.namePath()).toBe('RxNorm/Drug')
    expect(sg.nodes.length).toBeGreaterThan(5)
  })
})
