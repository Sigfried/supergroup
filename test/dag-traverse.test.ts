import { test, expect } from 'vitest'
import { Fifo, assignMinDepths } from '../src/dag/traverse'
import { fromParentIds } from '../src/dag/constructors'

test('Fifo is first-in first-out with O(1) shift semantics', () => {
  const q = new Fifo<number>()
  q.push(1); q.push(2); q.push(3)
  expect(q.shift()).toBe(1)
  expect(q.length).toBe(2)
  q.push(4)
  expect([q.shift(), q.shift(), q.shift()]).toEqual([2, 3, 4])
  expect(q.shift()).toBeUndefined()
  expect(q.length).toBe(0)
})

test('assignMinDepths assigns min depth over children edges', () => {
  // diamond: a → b, a → c, b → d, c → d, plus a → d shortcut
  const sg = fromParentIds([
    { id: 'a' }, { id: 'b', parentIds: ['a'] }, { id: 'c', parentIds: ['a'] },
    { id: 'd', parentIds: ['b', 'c', 'a'] },
  ])
  const byId = Object.fromEntries(sg.nodes.map(n => [n.id, n]))
  byId['a']!.depth = 99; byId['d']!.depth = 99   // scribble, then recompute
  assignMinDepths(sg.roots)
  expect(byId['a']!.depth).toBe(0)
  expect(byId['d']!.depth).toBe(1)               // min over the a→d shortcut
})
