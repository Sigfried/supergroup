import { test, expectTypeOf } from 'vitest'
import { supergroup, type SGNode, type SGNodeLike } from '../src/index'

test('record type flows through grouping and aggregates', () => {
  const recs = [{ country: 'US', medals: 3 }]
  const sg = supergroup(recs, 'country')
  expectTypeOf(sg.roots).toEqualTypeOf<SGNode<{ country: string; medals: number }>[]>()
  const n = sg.roots[0]!
  expectTypeOf(n.records[0]!.medals).toBeNumber()
  expectTypeOf(n.agg(r => r.medals).mean).toBeNumber()
  // SGNodeLike is importable from the root and structurally satisfied
  const like: SGNodeLike = n
  expectTypeOf(like.label).toBeString()
})
