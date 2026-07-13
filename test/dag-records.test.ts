import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { attachRecords } from '../src/dag/records'

// diamond: A→B, A→C, B→D, C→D
const DIAMOND = [
  { id: 'A' }, { id: 'B', parentIds: ['A'] },
  { id: 'C', parentIds: ['A'] }, { id: 'D', parentIds: ['B', 'C'] },
]
interface Pt { concept: string; n: number }

describe('attachRecords + union rollup', () => {
  it('attaches by id, reports unmatched', () => {
    const sg = fromParentIds<Pt>(DIAMOND)
    const res = attachRecords(sg, [
      { concept: 'D', n: 10 }, { concept: 'B', n: 5 }, { concept: 'ghost', n: 1 },
    ], r => r.concept)
    expect(res.matched).toBe(2)
    expect(res.unmatched.map(r => r.concept)).toEqual(['ghost'])
    expect(sg.select(['D'])[0]!.records).toHaveLength(1)
  })
  it('THE M1 ACCEPTANCE TEST: a record under a multi-parent node counts ONCE at the ancestor', () => {
    const sg = fromParentIds<Pt>(DIAMOND)
    attachRecords(sg, [{ concept: 'D', n: 10 }], r => r.concept)
    const a = sg.select(['A'])[0]!
    // D is reachable via B and via C — union-then-aggregate must count it once
    expect(a.rollup().count).toBe(1)
    expect(a.rollup(r => r.n).sum).toBe(10)
  })
  it('an array-valued byKey attaches to several nodes but stays one record in rollups', () => {
    const sg = fromParentIds<Pt>(DIAMOND)
    attachRecords(sg, [{ concept: 'multi', n: 7 }], () => ['B', 'C'])
    expect(sg.select(['A'])[0]!.rollup().count).toBe(1)
    expect(sg.select(['A'])[0]!.rollup(r => r.n).sum).toBe(7)
  })
  it('constructor option {records, recordKey} equals post-hoc attachRecords', () => {
    const sg = fromParentIds<Pt>(DIAMOND, { records: [{ concept: 'D', n: 10 }], recordKey: r => r.concept })
    expect(sg.select(['D'])[0]!.records).toHaveLength(1)
    expect(sg.select(['A'])[0]!.rollup(r => r.n).sum).toBe(10)
  })
})
