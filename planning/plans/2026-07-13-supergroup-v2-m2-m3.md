# supergroup v2 — M2+M3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M2 (sequence module + `toD3` adapter) and M3 (compare module), per
[the spec](../specs/2026-07-13-supergroup-v2-design.md). After this, only the
docs/publish milestone remains before 2.0.0.

**Architecture:** `groupBySequence` builds trees by iterated
successor-grouping (the lifeflow pattern) on top of the existing `groupLevel`
primitive; nodes gain a `direction` field that path methods respect. `toD3`
emits plain nested objects consumable by `d3.hierarchy` with an explicit
DAG-unfolding choice. `compare` merges two collections level-by-level into
nodes carrying a `cmp` payload.

**Tech Stack:** TypeScript (strict), vitest, existing v2 core (M1).

## Global Constraints

- **Zero runtime dependencies**; `toD3` emits duck shapes, no d3 import.
- **Strict TS, no `any`**.
- **No lazy state** — everything built eagerly.
- **Union-then-aggregate, never sum-over-paths.**
- **The core never materializes path-rows.**
- **Do not modify v1 files**: `supergroup.js`, `oldDemoStuff/`, `oldTests/`,
  `test/supergroup_vows.js`; `package.json` stays as-is this milestone.
- Commit after every task; single test files while iterating
  (`npx vitest run test/<file>.test.ts`), full suite at task boundaries;
  `npm run typecheck` must exit 0 before every commit.

## File structure

```
src/
  node.ts              MODIFIED: direction field; path/namePath reversal; cmp field
  sequence/
    index.ts           groupBySequence + SequenceOpts
  compare/
    index.ts           compare + CompareOpts (+ CmpInfo type on node.ts)
  adapters/
    d3.ts              toD3 + D3Node + ToD3Opts
    index.ts           MODIFIED: re-export toD3
  index.ts             MODIFIED: re-export new types
test/
  seq-fixtures.ts      timeline builder (records with next/prev links)
  sequence.test.ts     forward / backward / both / maxDepth
  d3.test.ts           tree, DAG firstOccurrence vs repeat, multi-root wrapper
  compare.test.ts      tree (path) and dag (id) modes
  exports.test.ts      MODIFIED: new surfaces
```

Semantics fixed by this plan (the spec's M2/M3 sections leave them open;
Task 7 syncs the spec):

- Node ids under `direction: 'both'`: forward tree ids are prefixed `+`,
  backward tree ids `-` (e.g. `+B/C`, `-B/A`) so the two anchor trees can't
  collide. Forward-only / backward-only collections use plain path ids.
- `maxDepth` counts levels beyond the start level: a node at relative depth
  `maxDepth` gets no children. Default unlimited.
- Backward nodes: `path()`/`namePath()` return TEMPORAL order (earliest
  event first) by reversing the structural pedigree; `pedigree()` itself
  stays structural (root→node).
- `compare` matches by `String(key)` per level (`by: 'path'`, default) or by
  `id` with a memo so multi-parent dag nodes merge once (`by: 'id'`).
  `countDelta` = b-count − a-count. Merged nodes carry
  `cmp: { in: 'a'|'b'|'both', a?, b?, countDelta }`.

---

### Task 1: Sequence fixture + forward grouping

**Files:**
- Create: `src/sequence/index.ts`
- Create: `test/seq-fixtures.ts`
- Modify: `src/node.ts` (add `direction` field only — no method changes yet)
- Test: `test/sequence.test.ts`

**Interfaces:**
- Consumes: `groupLevel(records, dim, parent, ctx, depth, idPrefix, opts)`
  and `normalizeDims` from M1; `SGNode`, `SGContext`, `Supergroup`.
- Produces:
  - `SGNode.direction?: 'forward' | 'backward'` (field + `SGNodeInit`
    member).
  - `interface SequenceOpts<R> { key: string | ((r: R) => unknown); next?: (r: R) => R | null | undefined; prev?: (r: R) => R | null | undefined; direction: 'forward' | 'backward' | 'both'; maxDepth?: number }`
  - `groupBySequence<R>(startRecords: R[], opts: SequenceOpts<R>): Supergroup<R>` —
    forward direction working end-to-end this task; backward/both throw
    "not implemented" until Tasks 2–3? NO — implement the shared builder
    fully but only WIRE forward here; backward and both come in Tasks 2–3
    per the code below (the builder is direction-agnostic already).
  - `makeTimelines(spec: Record<string, string[]>): Evt[]` fixture helper;
    `Evt { ent, evt, t, next?, prev? }`; `TL` = `{ e1: ['A','B','C'], e2: ['A','C'], e3: ['B','C'] }`.

- [ ] **Step 1: Write the fixture** — `test/seq-fixtures.ts`:

```ts
export interface Evt {
  ent: string
  evt: string
  t: number
  next?: Evt
  prev?: Evt
}

/** Build linked event records per entity: { e1: ['A','B'] } → A<->B chain */
export function makeTimelines(spec: Record<string, string[]>): Evt[] {
  const all: Evt[] = []
  for (const [ent, names] of Object.entries(spec)) {
    let prev: Evt | undefined
    names.forEach((evt, i) => {
      const e: Evt = { ent, evt, t: i }
      if (prev) {
        prev.next = e
        e.prev = prev
      }
      all.push(e)
      prev = e
    })
  }
  return all
}

export const TL = { e1: ['A', 'B', 'C'], e2: ['A', 'C'], e3: ['B', 'C'] }
```

- [ ] **Step 2: Write the failing test** — `test/sequence.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { groupBySequence } from '../src/sequence/index'
import { makeTimelines, TL, type Evt } from './seq-fixtures'

describe('groupBySequence forward', () => {
  const all = makeTimelines(TL)
  const starts = all.filter(e => !e.prev)
  const sg = groupBySequence(starts, {
    key: (e: Evt) => e.evt, next: e => e.next, direction: 'forward',
  })

  it('level 0 groups start records by key', () => {
    expect(sg.roots.map(n => [n.label, n.records.length])).toEqual([['A', 2], ['B', 1]])
    expect(sg.roots[0]!.direction).toBe('forward')
    expect(sg.roots[0]!.depth).toBe(0)
  })
  it('each level groups the records’ successors', () => {
    const a = sg.roots[0]!
    expect(a.children.map(n => [n.label, n.records.length])).toEqual([['B', 1], ['C', 1]])
    expect(sg.node('A/B/C')!.records).toHaveLength(1)
    expect(sg.node('A/B/C')!.namePath()).toBe('A/B/C')
  })
  it('records without a successor fall out of the next level', () => {
    // timeline e3 is B->C; C has no next, so B's subtree ends at C
    expect(sg.node('B/C')!.children).toEqual([])
  })
  it('throws when the required accessor is missing', () => {
    expect(() => groupBySequence(starts, { key: (e: Evt) => e.evt, direction: 'forward' }))
      .toThrow(/requires a next accessor/)
  })
})
```

- [ ] **Step 3: Run** — `npx vitest run test/sequence.test.ts`
Expected: FAIL — cannot resolve `../src/sequence/index`.

- [ ] **Step 4: Implement**

In `src/node.ts`: add to the class fields `direction?: 'forward' | 'backward'`
and to `SGNodeInit<R>` the member `direction?: 'forward' | 'backward'`, and in
the constructor `this.direction = init.direction`.

`src/sequence/index.ts`:

```ts
import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'
import { groupLevel } from '../group'
import { normalizeDims } from '../dims'

export interface SequenceOpts<R> {
  key: string | ((r: R) => unknown)
  next?: (r: R) => R | null | undefined
  prev?: (r: R) => R | null | undefined
  direction: 'forward' | 'backward' | 'both'
  maxDepth?: number
}

export function groupBySequence<R>(startRecords: R[], opts: SequenceOpts<R>): Supergroup<R> {
  const { direction } = opts
  if ((direction === 'forward' || direction === 'both') && !opts.next)
    throw new Error(`direction '${direction}' requires a next accessor`)
  if ((direction === 'backward' || direction === 'both') && !opts.prev)
    throw new Error(`direction '${direction}' requires a prev accessor`)
  const [dim] = normalizeDims<R>([opts.key])
  const ctx: SGContext = { totalRecords: startRecords.length }
  const maxDepth = opts.maxDepth ?? Infinity

  // Build one direction's tree: level 0 groups startRecords; level n+1
  // groups each node's records' successors (the lifeflow pattern).
  const buildDirection = (
    dirn: 'forward' | 'backward',
    step: (r: R) => R | null | undefined,
    idPrefix: string,
    baseDepth: number,
  ): SGNode<R>[] => {
    const grow = (node: SGNode<R>): void => {
      if (node.depth - baseDepth >= maxDepth) return
      const successors: R[] = []
      for (const r of node.records) {
        const s = step(r)
        if (s != null) successors.push(s)
      }
      if (!successors.length) return
      const kids = groupLevel(successors, dim!, node, ctx, node.depth + 1, `${node.id}/`, {})
      for (const k of kids) {
        k.direction = dirn
        grow(k)
      }
    }
    const level0 = groupLevel(startRecords, dim!, null, ctx, baseDepth, idPrefix, {})
    for (const n of level0) {
      n.direction = dirn
      grow(n)
    }
    return level0
  }

  if (direction === 'both') {
    const root = new SGNode<R>({
      id: '(root)', key: null, label: 'root', records: [...startRecords], synthetic: true, ctx,
    })
    const fwd = buildDirection('forward', opts.next!, '+', 1)
    const bwd = buildDirection('backward', opts.prev!, '-', 1)
    root.children = [...fwd, ...bwd]
    for (const n of root.children) n.parents.push(root)
    return new Supergroup(root.children, { root, ctx })
  }

  const step = direction === 'forward' ? opts.next! : opts.prev!
  const roots = buildDirection(direction, step, '', 0)
  return new Supergroup(roots, { ctx })
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run test/sequence.test.ts` → PASS (4 tests).
Run: `npm run typecheck` → 0.

- [ ] **Step 6: Commit**

```bash
git add src/sequence/index.ts src/node.ts test/seq-fixtures.ts test/sequence.test.ts
git commit -m "v2: groupBySequence forward — iterated successor grouping"
```

---

### Task 2: Backward direction + temporal path reversal

**Files:**
- Modify: `src/node.ts` (path/namePath respect `direction`)
- Test: `test/sequence.test.ts` (append a describe block)

**Interfaces:**
- Consumes: Task 1's builder (backward is already wired — `direction:
  'backward'` with a `prev` accessor works; this task LOCKS it and adds the
  path semantics).
- Produces: on backward nodes, `path()` and `namePath()` return TEMPORAL
  order (earliest first) by reversing; `pedigree()` unchanged (structural).

- [ ] **Step 1: Write the failing test** — append to `test/sequence.test.ts`:

```ts
describe('groupBySequence backward', () => {
  const all = makeTimelines(TL)
  const ends = all.filter(e => !e.next)
  const sg = groupBySequence(ends, {
    key: (e: Evt) => e.evt, prev: e => e.prev, direction: 'backward',
  })

  it('groups predecessors level by level', () => {
    expect(sg.roots.map(n => [n.label, n.records.length])).toEqual([['C', 3]])
    const c = sg.roots[0]!
    expect(c.children.map(n => [n.label, n.records.length])).toEqual([['B', 2], ['A', 1]])
    expect(c.direction).toBe('backward')
  })
  it('path/namePath are temporal (reversed); pedigree stays structural', () => {
    const cba = sg.node(['C', 'B', 'A'])!
    expect(cba.pedigree().map(n => n.label)).toEqual(['C', 'B', 'A'])
    expect(cba.namePath()).toBe('A/B/C')
    expect(cba.path()).toEqual(['A', 'B', 'C'])
  })
})
```

- [ ] **Step 2: Run** — first test should PASS already (builder is
direction-agnostic); the second FAILS (`namePath()` returns 'C/B/A').

- [ ] **Step 3: Implement** — in `src/node.ts`, replace the two path methods:

```ts
  path(): unknown[] {
    const keys = this.pedigree().filter(n => !n.synthetic).map(n => n.key)
    if (this.direction === 'backward') keys.reverse()
    return keys
  }

  namePath(sep = '/'): string {
    const labels = this.pedigree().filter(n => !n.synthetic).map(n => n.label)
    if (this.direction === 'backward') labels.reverse()
    return labels.join(sep)
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/sequence.test.ts test/node-nav.test.ts` → PASS
(node-nav must stay green — `direction` is undefined on plain grouped nodes).
Run: `npm run typecheck` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/node.ts test/sequence.test.ts
git commit -m "v2: backward sequence grouping; temporal path reversal"
```

---

### Task 3: Anchored 'both' + maxDepth

**Files:**
- Test: `test/sequence.test.ts` (append — LOCK task; Task 1's implementation
  already contains 'both' and maxDepth; fix `src/sequence/index.ts` only if a
  test fails, within the specified algorithm)

**Interfaces:**
- Produces verified semantics: `'both'` builds forward (`+` id prefix) and
  backward (`-` prefix) trees under one synthetic root; nodes at relative
  depth `maxDepth` get no children.

- [ ] **Step 1: Write the failing/locking test** — append:

```ts
describe('groupBySequence both + maxDepth', () => {
  const all = makeTimelines(TL)

  it("'both' hangs a forward and a backward tree under one synthetic root", () => {
    const anchors = all.filter(e => e.evt === 'B')
    const sg = groupBySequence(anchors, {
      key: (e: Evt) => e.evt, next: e => e.next, prev: e => e.prev, direction: 'both',
    })
    expect(sg.root!.synthetic).toBe(true)
    expect(sg.root!.children.map(c => [c.id, c.direction])).toEqual([
      ['+B', 'forward'], ['-B', 'backward'],
    ])
    expect(sg.select(['+B/C'])[0]!.records).toHaveLength(2)
    expect(sg.select(['-B/A'])[0]!.records).toHaveLength(1)
    expect(sg.select(['-B/A'])[0]!.namePath()).toBe('A/B')
  })
  it('maxDepth stops growth at the given relative depth', () => {
    const starts = all.filter(e => !e.prev)
    const sg = groupBySequence(starts, {
      key: (e: Evt) => e.evt, next: e => e.next, direction: 'forward', maxDepth: 1,
    })
    expect(sg.node('A/B')).toBeDefined()
    expect(sg.node('A/B')!.children).toEqual([])
    expect(sg.node('A/B/C')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run test/sequence.test.ts`. Expected:
PASS if Task 1's implementation is correct; on FAIL, fix within
`groupBySequence` (the `both` branch or the `grow` depth guard) only.

- [ ] **Step 3: Full suite + typecheck** — all green, 0.

- [ ] **Step 4: Commit**

```bash
git add test/sequence.test.ts src/sequence/index.ts
git commit -m "v2: lock anchored-both and maxDepth sequence semantics"
```

---

### Task 4: toD3 adapter

**Files:**
- Create: `src/adapters/d3.ts`
- Test: `test/d3.test.ts`

**Interfaces:**
- Produces:
  - `interface D3Node<R> { id: string; name: string; key: unknown; records: R[]; children?: D3Node<R>[] }`
  - `interface ToD3Opts { onRepeat?: 'firstOccurrence' | 'repeat' }` (default
    `'firstOccurrence'`)
  - `toD3<R>(target: SGNode<R> | Supergroup<R>, opts?: ToD3Opts): D3Node<R>` —
    plain nested objects (`d3.hierarchy(out)` works untouched; no d3
    import). A Supergroup with `root` converts from it; multiple roots get a
    synthesized `{id:'(root)', name:'root', key:null, records:[]}` wrapper.
    `firstOccurrence`: a multi-parent node appears under its first-visited
    parent only. `repeat`: every occurrence gets a full copy (safe —
    children edges are acyclic by construction).

- [ ] **Step 1: Write the failing test** — `test/d3.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toD3 } from '../src/adapters/d3'
import { fromParentIds } from '../src/dag/constructors'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

const DIAMOND = [
  { id: 'A' }, { id: 'B', parentIds: ['A'] },
  { id: 'C', parentIds: ['A'] }, { id: 'D', parentIds: ['B', 'C'] },
]

describe('toD3', () => {
  it('multi-root grouped tree gets a wrapper root', () => {
    const out = toD3(supergroup(RXS, ['vocab', 'domain']))
    expect(out.id).toBe('(root)')
    expect(out.children!.map(c => c.name)).toEqual(['RxNorm', 'SNOMED'])
    expect(out.children![0]!.children!.map(c => c.name)).toEqual(['Drug', 'Procedure'])
    expect(out.children![0]!.records).toHaveLength(3)
  })
  it('firstOccurrence keeps one copy of a multi-parent node', () => {
    const out = toD3(fromParentIds(DIAMOND))
    const a = out.children![0]!
    const [b, c] = a.children!
    expect(b!.children!.map(n => n.id)).toEqual(['D'])
    expect(c!.children).toBeUndefined()
  })
  it('repeat duplicates the subtree per parent', () => {
    const out = toD3(fromParentIds(DIAMOND), { onRepeat: 'repeat' })
    const a = out.children![0]!
    expect(a.children![0]!.children!.map(n => n.id)).toEqual(['D'])
    expect(a.children![1]!.children!.map(n => n.id)).toEqual(['D'])
  })
  it('accepts a single node as target', () => {
    const sg = supergroup(RXS, ['vocab', 'domain'])
    const out = toD3(sg.roots[0]!)
    expect(out.name).toBe('RxNorm')
    expect(out.children!.map(c => c.name)).toEqual(['Drug', 'Procedure'])
  })
})
```

- [ ] **Step 2: Run** — FAIL: cannot resolve `../src/adapters/d3`.

- [ ] **Step 3: Implement** — `src/adapters/d3.ts`:

```ts
import type { SGNode } from '../node'
import { Supergroup } from '../collection'

export interface D3Node<R> {
  id: string
  name: string
  key: unknown
  records: R[]
  children?: D3Node<R>[]
}

export interface ToD3Opts { onRepeat?: 'firstOccurrence' | 'repeat' }

export function toD3<R>(target: SGNode<R> | Supergroup<R>, opts: ToD3Opts = {}): D3Node<R> {
  // 'repeat' recurses without a seen-set (children edges are acyclic);
  // 'firstOccurrence' skips nodes already emitted elsewhere.
  const seen = (opts.onRepeat ?? 'firstOccurrence') === 'firstOccurrence'
    ? new Set<SGNode<R>>()
    : null
  const convert = (n: SGNode<R>): D3Node<R> => {
    seen?.add(n)
    const kids: D3Node<R>[] = []
    for (const c of n.children) {
      if (seen?.has(c)) continue
      kids.push(convert(c))
    }
    const out: D3Node<R> = { id: n.id, name: n.label, key: n.key, records: n.records }
    if (kids.length) out.children = kids
    return out
  }
  if (target instanceof Supergroup) {
    if (target.root) return convert(target.root)
    return {
      id: '(root)', name: 'root', key: null, records: [],
      children: target.roots.map(r => convert(r)),
    }
  }
  return convert(target)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/d3.test.ts` → PASS (4 tests). Typecheck → 0.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/d3.ts test/d3.test.ts
git commit -m "v2: toD3 adapter — explicit DAG unfolding, duck-shaped output"
```

---

### Task 5: compare — tree mode (by path)

**Files:**
- Modify: `src/node.ts` (add `cmp` field)
- Create: `src/compare/index.ts`
- Test: `test/compare.test.ts`

**Interfaces:**
- Produces:
  - On `SGNode<R>`: `cmp?: { in: 'a' | 'b' | 'both'; a?: SGNode<R>; b?: SGNode<R>; countDelta: number }`
    (declared inline in node.ts; export the type as `CmpInfo<R>` from
    node.ts). `countDelta` = (b records) − (a records).
  - `interface CompareOpts { by?: 'path' | 'id' }` (default `'path'`)
  - `compare<R>(a: Supergroup<R>, b: Supergroup<R>, opts?: CompareOpts): Supergroup<R>` —
    fresh merged nodes; per level, nodes matched by `String(key)` in
    a-order-then-new-b-order; merged `records` = a's then b's concatenated;
    `label`/`key`/`dim` from a's node when present, else b's; ids are path
    ids; `ctx.totalRecords` = a.ctx.totalRecords + b.ctx.totalRecords.
    `'id'` mode is Task 6 — this task implements the shared merge with the
    matchKey parameterized but only tests 'path'.

- [ ] **Step 1: Write the failing test** — `test/compare.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** — FAIL: cannot resolve `../src/compare/index`.

- [ ] **Step 3: Implement**

In `src/node.ts`, add the exported type and field:

```ts
export interface CmpInfo<R> {
  in: 'a' | 'b' | 'both'
  a?: SGNode<R>
  b?: SGNode<R>
  countDelta: number
}
```

field on the class: `cmp?: CmpInfo<R>` (not part of `SGNodeInit` — only
`compare` sets it, post-construction).

`src/compare/index.ts`:

```ts
import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'

export interface CompareOpts { by?: 'path' | 'id' }

export function compare<R>(a: Supergroup<R>, b: Supergroup<R>, opts: CompareOpts = {}): Supergroup<R> {
  const matchKey = opts.by === 'id'
    ? (n: SGNode<R>) => n.id
    : (n: SGNode<R>) => String(n.key)
  const ctx: SGContext = { totalRecords: a.ctx.totalRecords + b.ctx.totalRecords }
  const memo = opts.by === 'id' ? new Map<string, SGNode<R>>() : null

  const mergeLevel = (
    aNodes: SGNode<R>[], bNodes: SGNode<R>[],
    parent: SGNode<R> | null, depth: number, prefix: string,
  ): SGNode<R>[] => {
    const order: string[] = []
    const pairs = new Map<string, { a?: SGNode<R>; b?: SGNode<R> }>()
    for (const n of aNodes) {
      const k = matchKey(n)
      if (!pairs.has(k)) { pairs.set(k, {}); order.push(k) }
      pairs.get(k)!.a = n
    }
    for (const n of bNodes) {
      const k = matchKey(n)
      if (!pairs.has(k)) { pairs.set(k, {}); order.push(k) }
      pairs.get(k)!.b = n
    }
    return order.map(k => {
      const done = memo?.get(k)
      if (done) {
        if (parent && !done.parents.includes(parent)) done.parents.push(parent)
        return done
      }
      const { a: an, b: bn } = pairs.get(k)!
      const src = (an ?? bn)!
      const node = new SGNode<R>({
        // id mode: the match key IS the source id — keep it, no path prefix
        id: memo ? k : prefix + String(src.key),
        key: src.key, label: src.label, dim: src.dim,
        records: [...(an?.records ?? []), ...(bn?.records ?? [])], depth, ctx,
      })
      node.cmp = {
        in: an && bn ? 'both' : an ? 'a' : 'b',
        a: an, b: bn,
        countDelta: (bn?.records.length ?? 0) - (an?.records.length ?? 0),
      }
      if (parent) node.parents.push(parent)
      memo?.set(k, node)
      node.children = mergeLevel(an?.children ?? [], bn?.children ?? [], node, depth + 1, `${node.id}/`)
      return node
    })
  }

  const roots = mergeLevel(a.roots, b.roots, null, 0, '')
  return new Supergroup(roots, { ctx })
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/compare.test.ts` → PASS (3 tests). Typecheck → 0.

- [ ] **Step 5: Commit**

```bash
git add src/node.ts src/compare/index.ts test/compare.test.ts
git commit -m "v2: compare — level-merge with a/b/both membership and countDelta"
```

---

### Task 6: compare — dag mode (by id)

**Files:**
- Test: `test/compare.test.ts` (append — the memo path shipped in Task 5;
  this LOCKS it; fix `src/compare/index.ts` only on failure)

**Interfaces:**
- Produces verified semantics: `by: 'id'` merges multi-parent nodes ONCE
  (memoized by id), accumulating parents.

- [ ] **Step 1: Write the locking test** — append:

```ts
import { fromParentIds } from '../src/dag/constructors'

describe('compare (by id, dag)', () => {
  const DIAMOND = [
    { id: 'A' }, { id: 'B', parentIds: ['A'] },
    { id: 'C', parentIds: ['A'] }, { id: 'D', parentIds: ['B', 'C'] },
  ]
  const NO_C = [
    { id: 'A' }, { id: 'B', parentIds: ['A'] }, { id: 'D', parentIds: ['B'] },
  ]

  it('multi-parent nodes merge once, membership per node', () => {
    const sg = compare(fromParentIds(DIAMOND), fromParentIds(NO_C), { by: 'id' })
    const byId = new Map(sg.nodes.map(n => [n.id, n]))
    expect(sg.nodes).toHaveLength(4)                      // A, B, C, D — D once
    expect(byId.get('A/B/D'), 'id-mode uses source ids, not paths').toBeUndefined()
    expect(byId.get('D')!.cmp!.in).toBe('both')
    expect(byId.get('C')!.cmp!.in).toBe('a')
    expect(byId.get('D')!.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
  })
})
```

NOTE for the implementer: in `'id'` mode the merged node's `id` is the
SOURCE id (e.g. `'D'`), not a path-prefixed id — Task 5's code already
handles this (`id: memo ? k : prefix + String(src.key)`). If this test
fails, the licensed fix is confined to that id expression and the memo
handling in `mergeLevel`.

- [ ] **Step 2: Run** — `npx vitest run test/compare.test.ts`. Expected PASS;
on FAIL apply the licensed fix above in `src/compare/index.ts`; nothing else.

- [ ] **Step 3: Full suite + typecheck** — all green, 0.

- [ ] **Step 4: Commit**

```bash
git add test/compare.test.ts src/compare/index.ts
git commit -m "v2: lock dag compare — id-keyed memo merge, source ids"
```

---

### Task 7: Export surfaces, spec sync, full gate

**Files:**
- Modify: `src/index.ts`, `src/adapters/index.ts`
- Create: `src/sequence/` and `src/compare/` need no separate index (they ARE
  index.ts files already)
- Modify: `test/exports.test.ts`
- Modify: `planning/specs/2026-07-13-supergroup-v2-design.md` (sync the M2/M3
  sections to the semantics this plan fixed)

**Interfaces:**
- Produces the `supergroup/sequence` and `supergroup/compare` surfaces and
  completes `supergroup/adapters`.

- [ ] **Step 1: Extend the exports test** — in `test/exports.test.ts` add:

```ts
import * as sequence from '../src/sequence/index'
import * as cmp from '../src/compare/index'
```

and inside the describe block:

```ts
  it('sequence', () => {
    expect(sequence).toHaveProperty('groupBySequence')
  })
  it('compare', () => {
    expect(cmp).toHaveProperty('compare')
  })
  it('adapters include toD3', () => {
    expect(adapters).toHaveProperty('toD3')
  })
```

- [ ] **Step 2: Run** — `npx vitest run test/exports.test.ts` → the
adapters-include-toD3 case FAILS (not re-exported yet).

- [ ] **Step 3: Implement**

`src/adapters/index.ts` — add:

```ts
export { toD3 } from './d3'
export type { D3Node, ToD3Opts } from './d3'
```

`src/index.ts` — add:

```ts
export type { CmpInfo } from './node'
```

- [ ] **Step 4: Sync the spec** — in
`planning/specs/2026-07-13-supergroup-v2-design.md`:

1. In the **sequence module (M2)** section, after the existing paragraph,
   append:

```markdown
Fixed semantics: under `direction: 'both'` the forward tree's ids are
prefixed `+` and the backward tree's `-` (`+B/C`, `-B/A`); `maxDepth`
counts levels beyond the start level (a node at that relative depth gets
no children); backward nodes' `path()`/`namePath()` return temporal order
(reversed), `pedigree()` stays structural.
```

2. In the **compare module (M3)** section, replace the existing paragraph's
   last sentence ("Nodes matched by path (tree collections) or id (dag
   collections).") with:

```markdown
Nodes are matched by `String(key)` per level (`by: 'path'`, default) or by
source id with a memo so multi-parent dag nodes merge once (`by: 'id'`);
`countDelta` = b-count − a-count; merged nodes carry the `cmp` payload and
union the two sides' records.
```

- [ ] **Step 5: Full gate**

Run: `npx vitest run` → ALL green (expect 68 tests). `npm run typecheck` → 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/adapters/index.ts test/exports.test.ts planning/specs/2026-07-13-supergroup-v2-design.md
git commit -m "v2: sequence/compare/toD3 export surfaces; spec sync (M2/M3 semantics)"
```

---

## Post-M2/M3 (not in this plan)

The docs milestone: combined demo/documentation page (harvest the gh-pages
doc, the Toptal article, and the README — including the lifeflow demo rewrite
as its centerpiece), new README, `legacy/` move, packaging (`exports` map,
dist build), publish 2.0.0 as `latest`, then dmvd instructions. The M1
deferred-minors checklist in
[the M1 plan](2026-07-13-supergroup-v2-m1.md) gates the publish.
