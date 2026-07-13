# supergroup v2 — M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Milestone M1 of the v2 rewrite: core node model + grouping
constructor, dag module (parent-id/edge/parent-child constructors, cycle
handling, metrics, records, subgraph), selection helpers, and the
`toDagBrowserNodes` adapter — per
[the approved spec](../specs/2026-07-13-supergroup-v2-design.md).

**Architecture:** Wrapper class (`Supergroup<R>`) + plain node objects
(`SGNode<R>`) with plural `parents`. Constructors build the whole structure
eagerly; modules communicate only through the node model. Adapters emit
duck-shaped plain objects.

**Tech Stack:** TypeScript (strict), vitest, tsc for typecheck. No bundler
yet (build/publish wiring is a later milestone).

## Global Constraints

- **Zero runtime dependencies.** devDependencies only: `typescript`, `vitest`.
- **ESM-only TypeScript** in `src/`; extensionless relative imports;
  `moduleResolution: "bundler"`.
- **Strict TS, no `any`** (use `unknown` + narrowing; `Record<string, unknown>`
  for property access by string).
- **No lazy state**: every index/metric is computed eagerly at construction.
- **Union-then-aggregate, never sum-over-paths**: any operation combining
  records across nodes dedups records (and nodes) first.
- **The core never materializes path-rows** (one row per root-to-node path) —
  that is dag-browser-widget's job.
- **Do not modify v1 files**: `supergroup.js`, `oldDemoStuff/`, `oldTests/`,
  `test/supergroup_vows.js` stay untouched. In `package.json` only ADD
  `devDependencies` and `scripts` entries — do not change `name`, `version`,
  `main`, or add `"type": "module"` (v1 consumers install from this repo).
- Commit after every task. Run single test files while iterating
  (`npx vitest run test/<file>.test.ts`), the full suite at task boundaries.

## File structure

```
src/
  dims.ts            dimension-spec normalization
  node.ts            SGNode class (fields, navigation, aggregates)
  collection.ts      Supergroup class (roots, nodes index, lookup, select)
  group.ts           supergroup() constructor + groupLevel/regroupNode
  selection.ts       recordsFor / recordsUnder (stateless State replacement)
  index.ts           core public exports
  dag/
    build.ts         buildDag: adjacency, roots, cycle discipline, backedges
    constructors.ts  fromParentIds / fromEdges / fromParentChild
    metrics.ts       computeMetrics (maxDepth, height)
    records.ts       attachRecords
    subgraph.ts      subgraph(sg, ids)
    index.ts         dag public exports
  adapters/
    dagBrowser.ts    toDagBrowserNodes
    index.ts         adapter public exports
test/
  fixtures.ts        shared record + digraph fixtures
  *.test.ts          one file per task area
```

---

### Task 1: Tooling scaffold

**Files:**
- Modify: `package.json` (add scripts + devDependencies only)
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Test: `test/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run typecheck` (tsc --noEmit);
  `VERSION` export from `src/index.ts`.

- [ ] **Step 1: Add scripts and devDependencies to package.json**

In the existing `package.json`, add to `"scripts"` (keep existing entries):

```json
"test2": "vitest run",
"typecheck": "tsc --noEmit"
```

(`test2` because v1 already has a `test` script; rename to `test` when v1
moves to `legacy/`.) Add:

```json
"devDependencies": {
  "typescript": "^5.5.0",
  "vitest": "^3.0.0"
}
```

- [ ] **Step 2: Install** (needs user-approved package install)

Run: `npm install`
Expected: node_modules created, no errors. `package-lock.json` will update —
that file is fine to commit.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Create src/index.ts and smoke test**

`src/index.ts`:

```ts
export const VERSION = '2.0.0-dev'
```

`test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/index'

describe('scaffold', () => {
  it('imports the ESM source', () => {
    expect(VERSION).toBe('2.0.0-dev')
  })
})
```

- [ ] **Step 5: Verify**

Run: `npx vitest run test/smoke.test.ts` → PASS (1 test).
Run: `npm run typecheck` → exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/index.ts test/smoke.test.ts
git commit -m "v2: tooling scaffold (typescript + vitest, src/ tree)"
```

---

### Task 2: Dimension normalization

**Files:**
- Create: `src/dims.ts`
- Test: `test/dims.test.ts`

**Interfaces:**
- Produces:
  - `type DimAccessor<R> = (r: R) => unknown`
  - `interface DimSpec<R> { by: string | DimAccessor<R>; name?: string; multi?: boolean; sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number }`
  - `type DimInput<R> = string | DimAccessor<R> | DimSpec<R>`
  - `interface NormalDim<R> { accessor: DimAccessor<R>; name: string; multi: boolean; sortChildren?: ... }`
  - `normalizeDims<R>(dims: DimInput<R>[]): NormalDim<R>[]`

Note: `sortChildren` compares nodes, but `SGNode` doesn't exist yet. Use a
minimal structural type here to avoid a forward dependency:
`type SGNodeLike = { key: unknown; label: string; records: unknown[] }` —
`SGNode` satisfies it.

- [ ] **Step 1: Write the failing test** — `test/dims.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeDims } from '../src/dims'

interface Rec { vocab: string; tags: string[] }

describe('normalizeDims', () => {
  it('turns a string into a property accessor named after it', () => {
    const [d] = normalizeDims<Rec>(['vocab'])
    expect(d!.name).toBe('vocab')
    expect(d!.multi).toBe(false)
    expect(d!.accessor({ vocab: 'RxNorm', tags: [] })).toBe('RxNorm')
  })
  it('keeps a function accessor, naming it from fn.name or position', () => {
    const byVocab = (r: Rec) => r.vocab
    const [a, b] = normalizeDims<Rec>([byVocab, (r) => r.tags.length])
    expect(a!.name).toBe('byVocab')
    expect(b!.name).toBe('dim1')
  })
  it('accepts a DimSpec with multi and explicit name', () => {
    const [d] = normalizeDims<Rec>([{ by: 'tags', name: 'tag', multi: true }])
    expect(d!.name).toBe('tag')
    expect(d!.multi).toBe(true)
    expect(d!.accessor({ vocab: 'x', tags: ['a'] })).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/dims.test.ts`
Expected: FAIL — cannot resolve `../src/dims`.

- [ ] **Step 3: Implement** — `src/dims.ts`:

```ts
export type DimAccessor<R> = (r: R) => unknown

export type SGNodeLike = { key: unknown; label: string; records: unknown[] }

export interface DimSpec<R> {
  by: string | DimAccessor<R>
  name?: string
  multi?: boolean
  sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number
}

export type DimInput<R> = string | DimAccessor<R> | DimSpec<R>

export interface NormalDim<R> {
  accessor: DimAccessor<R>
  name: string
  multi: boolean
  sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number
}

function toAccessor<R>(by: string | DimAccessor<R>): DimAccessor<R> {
  return typeof by === 'string' ? (r: R) => (r as Record<string, unknown>)[by] : by
}

export function normalizeDims<R>(dims: DimInput<R>[]): NormalDim<R>[] {
  return dims.map((d, i) => {
    if (typeof d === 'string') return { accessor: toAccessor<R>(d), name: d, multi: false }
    if (typeof d === 'function') return { accessor: d, name: d.name || `dim${i}`, multi: false }
    const name = d.name ?? (typeof d.by === 'string' ? d.by : d.by.name || `dim${i}`)
    return { accessor: toAccessor<R>(d.by), name, multi: d.multi ?? false, sortChildren: d.sortChildren }
  })
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/dims.test.ts` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dims.ts test/dims.test.ts
git commit -m "v2: dimension-spec normalization"
```

---

### Task 3: SGNode + single-level grouping

**Files:**
- Create: `src/node.ts` (fields only this task; methods come in Tasks 5–6)
- Create: `src/collection.ts`
- Create: `src/group.ts`
- Create: `test/fixtures.ts`
- Test: `test/group.test.ts`

**Interfaces:**
- Consumes: `normalizeDims`, `NormalDim`, `DimInput`, `GroupOpts` from Task 2.
- Produces:
  - `interface SGContext { totalRecords: number }`
  - `class SGNode<R>` with fields `id: string; key: unknown; label: string; dim?: string; records: R[]; parents: SGNode<R>[]; children: SGNode<R>[]; depth: number; synthetic?: boolean; maxDepth?: number; height?: number; ctx: SGContext` and `toString(): string` returning `label`. Constructor: `new SGNode<R>({ id, key, label, dim?, records?, depth?, synthetic?, ctx })`.
  - `class Supergroup<R>` with `roots: SGNode<R>[]`, `root?: SGNode<R>`, `nodes: SGNode<R>[]` (iterative DFS pre-order, each node once), `backedges: BackEdge<R>[]`, `ctx: SGContext`, `flatten(): SGNode<R>[]`. Constructor: `new Supergroup(roots, { root?, backedges?, ctx })`. `type BackEdge<R> = { parent: SGNode<R>; child: SGNode<R> }`.
  - `supergroup<R>(records, dims, opts?): Supergroup<R>` and `groupLevel<R>(records, dim, parent, ctx, depth, idPrefix, opts): SGNode<R>[]` from `src/group.ts`; `interface GroupOpts<R> { root?: 'none' | 'synthetic'; excludeValues?: unknown[] }`.

- [ ] **Step 1: Write fixtures** — `test/fixtures.ts`:

```ts
export interface Rx { vocab: string; domain: string; name: string; cost: number }

export const RXS: Rx[] = [
  { vocab: 'RxNorm', domain: 'Drug', name: 'aspirin', cost: 2 },
  { vocab: 'RxNorm', domain: 'Drug', name: 'warfarin', cost: 10 },
  { vocab: 'RxNorm', domain: 'Procedure', name: 'infusion', cost: 50 },
  { vocab: 'SNOMED', domain: 'Condition', name: 'headache', cost: 0 },
  { vocab: 'SNOMED', domain: 'Drug', name: 'aspirin', cost: 3 },
]

// dmvd-shaped digraph: multi-parent D, self-loop on E, rootless cycle F<->G
export const DAG_ITEMS = [
  { id: 'A', name: 'Alpha' },
  { id: 'B', name: 'Beta', parentIds: ['A'] },
  { id: 'C', name: 'Gamma', parentIds: ['A'] },
  { id: 'D', name: 'Delta', parentIds: ['B', 'C'] },
  { id: 'E', name: 'Epsilon', parentIds: ['B', 'E'] },
  { id: 'F', name: 'Zeta', parentIds: ['G'] },
  { id: 'G', name: 'Eta', parentIds: ['F'] },
]
```

- [ ] **Step 2: Write the failing tests** — `test/group.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/group'
import { RXS } from './fixtures'

describe('supergroup() single dim', () => {
  it('groups records by a string dim, preserving first-seen order', () => {
    const sg = supergroup(RXS, ['vocab'])
    expect(sg.roots.map(n => n.label)).toEqual(['RxNorm', 'SNOMED'])
    expect(sg.roots[0]!.records).toHaveLength(3)
    expect(sg.roots[0]!.dim).toBe('vocab')
    expect(sg.roots[0]!.depth).toBe(0)
    expect(sg.roots[0]!.id).toBe('RxNorm')
    expect(String(sg.roots[0])).toBe('RxNorm')       // toString()
    expect(sg.nodes).toHaveLength(2)
    expect(sg.flatten()).toBe(sg.nodes)
  })
  it('groups Date keys by value, not identity (the es6-branch fix)', () => {
    const recs = [{ d: new Date(2020, 0, 1) }, { d: new Date(2020, 0, 1) }]
    const sg = supergroup(recs, [(r: { d: Date }) => r.d])
    expect(sg.roots).toHaveLength(1)
    expect(sg.roots[0]!.key).toBeInstanceOf(Date)
    expect(sg.roots[0]!.records).toHaveLength(2)
  })
  it('excludeValues skips keys', () => {
    const sg = supergroup(RXS, ['vocab'], { excludeValues: ['SNOMED'] })
    expect(sg.roots.map(n => n.label)).toEqual(['RxNorm'])
  })
  it('multi dims put one record in several sibling groups', () => {
    const recs = [{ tags: ['a', 'b'] }, { tags: ['b'] }]
    const sg = supergroup(recs, [{ by: 'tags', name: 'tag', multi: true }])
    expect(sg.roots.map(n => String(n.key)).sort()).toEqual(['a', 'b'])
    expect(sg.node('b')!.records).toHaveLength(2)
  })
  it('sortChildren orders a level', () => {
    const sg = supergroup(RXS, [{ by: 'domain', sortChildren: (a, b) => b.records.length - a.records.length }])
    expect(sg.roots.map(n => n.label)).toEqual(['Drug', 'Procedure', 'Condition'])
  })
})
```

(The `sg.node('b')` call is defined in Task 7; for THIS task, replace that
line with `expect(sg.roots.find(n => n.key === 'b')!.records).toHaveLength(2)`
and switch it to `sg.node()` in Task 7.)

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run test/group.test.ts`
Expected: FAIL — cannot resolve `../src/group`.

- [ ] **Step 4: Implement** — three files.

`src/node.ts`:

```ts
export interface SGContext { totalRecords: number }

export interface SGNodeInit<R> {
  id: string
  key: unknown
  label: string
  dim?: string
  records?: R[]
  depth?: number
  synthetic?: boolean
  ctx: SGContext
}

export class SGNode<R> {
  id: string
  key: unknown
  label: string
  dim?: string
  records: R[]
  parents: SGNode<R>[] = []
  children: SGNode<R>[] = []
  depth: number
  synthetic?: boolean
  maxDepth?: number   // dag module fills these
  height?: number
  ctx: SGContext

  constructor(init: SGNodeInit<R>) {
    this.id = init.id
    this.key = init.key
    this.label = init.label
    this.dim = init.dim
    this.records = init.records ?? []
    this.depth = init.depth ?? 0
    this.synthetic = init.synthetic
    this.ctx = init.ctx
  }

  toString(): string { return this.label }
}
```

`src/collection.ts`:

```ts
import type { SGContext, SGNode } from './node'

export type BackEdge<R> = { parent: SGNode<R>; child: SGNode<R> }

export class Supergroup<R> {
  roots: SGNode<R>[]
  root?: SGNode<R>
  nodes: SGNode<R>[]
  backedges: BackEdge<R>[]
  ctx: SGContext

  constructor(roots: SGNode<R>[], opts: { root?: SGNode<R>; backedges?: BackEdge<R>[]; ctx: SGContext }) {
    this.roots = roots
    this.root = opts.root
    this.backedges = opts.backedges ?? []
    this.ctx = opts.ctx
    this.nodes = this.computeNodes()
  }

  /** iterative DFS pre-order; each node once, even multi-parent nodes */
  private computeNodes(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const start = this.root ? [this.root] : this.roots
    const stack = [...start].reverse()
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!)
    }
    return out
  }

  flatten(): SGNode<R>[] { return this.nodes }
}
```

`src/group.ts`:

```ts
import { SGNode, type SGContext } from './node'
import { Supergroup } from './collection'
import { normalizeDims, type DimInput, type NormalDim } from './dims'

export interface GroupOpts<R> {
  root?: 'none' | 'synthetic'
  excludeValues?: unknown[]
}

/** Map-identity form of a key: Dates compare by value (es6-branch fix) */
function mapKey(key: unknown): unknown {
  return key instanceof Date ? ` date:${key.getTime()}` : key
}

function isExcluded(key: unknown, excludeValues?: unknown[]): boolean {
  return !!excludeValues?.some(v => v === key || String(v) === String(key))
}

export function groupLevel<R>(
  records: R[],
  dim: NormalDim<R>,
  parent: SGNode<R> | null,
  ctx: SGContext,
  depth: number,
  idPrefix: string,
  opts: GroupOpts<R>,
): SGNode<R>[] {
  const byKey = new Map<unknown, SGNode<R>>()
  for (const r of records) {
    const raw = dim.accessor(r)
    const keys = dim.multi && Array.isArray(raw) ? raw : [raw]
    for (const key of keys) {
      if (isExcluded(key, opts.excludeValues)) continue
      const mk = mapKey(key)
      let node = byKey.get(mk)
      if (!node) {
        node = new SGNode<R>({
          id: idPrefix + String(key), key, label: String(key), dim: dim.name, depth, ctx,
        })
        if (parent) node.parents.push(parent)
        byKey.set(mk, node)
      }
      node.records.push(r)
    }
  }
  const level = [...byKey.values()]
  if (dim.sortChildren) level.sort(dim.sortChildren)
  if (parent) parent.children = level
  return level
}

export function supergroup<R>(
  records: R[],
  dims: DimInput<R> | DimInput<R>[],
  opts: GroupOpts<R> = {},
): Supergroup<R> {
  const nd = normalizeDims(Array.isArray(dims) ? dims : [dims])
  const ctx: SGContext = { totalRecords: records.length }
  const root = opts.root === 'synthetic'
    ? new SGNode<R>({ id: '(root)', key: null, label: 'root', records: [...records], synthetic: true, ctx })
    : undefined
  const build = (parent: SGNode<R> | null, recs: R[], i: number, depth: number, prefix: string): SGNode<R>[] => {
    if (i >= nd.length) return []
    const level = groupLevel(recs, nd[i]!, parent, ctx, depth, prefix, opts)
    for (const n of level) build(n, n.records, i + 1, depth + 1, `${n.id}/`)
    return level
  }
  const roots = build(root ?? null, records, 0, root ? 1 : 0, '')
  return new Supergroup(roots, { root, ctx })
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run test/group.test.ts` → PASS (5 tests).
Run: `npm run typecheck` → exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/node.ts src/collection.ts src/group.ts test/fixtures.ts test/group.test.ts
git commit -m "v2: SGNode, Supergroup, single-level grouping"
```

---

### Task 4: Multi-level grouping + synthetic root

**Files:**
- Modify: `src/group.ts` (no change expected — the recursive `build` already
  handles it; this task exists to LOCK the behavior with tests)
- Test: `test/group-multilevel.test.ts`

**Interfaces:**
- Consumes: `supergroup` from Task 3.
- Produces: verified multi-level semantics later tasks rely on: child `id` =
  `parentId + '/' + String(key)`; `depth` increments per level; synthetic
  root has `id '(root)'`, `key null`, `label 'root'`, `depth 0`, all records;
  `sg.nodes` starts with the synthetic root when present.

- [ ] **Step 1: Write the failing test** — `test/group-multilevel.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** — `npx vitest run test/group-multilevel.test.ts`

One expected failure: with `root: 'synthetic'` the roots' `parents` is empty
because `build` passes `root ?? null` as parent but Task 3's `groupLevel`
already wires parent — verify. If both tests pass unchanged, that's fine:
proceed to commit (behavior was already correct; the tests lock it).

- [ ] **Step 3: Fix if needed**

If `parents`/`children` are not wired for the synthetic root, the fix is in
`supergroup()`: the first `build` call already passes `root ?? null` — that
is correct as written in Task 3. No other change is licensed by this task.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/group-multilevel.test.ts` → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add test/group-multilevel.test.ts src/group.ts
git commit -m "v2: lock multi-level + synthetic-root semantics"
```

---

### Task 5: Node navigation

**Files:**
- Modify: `src/node.ts` (add methods)
- Test: `test/node-nav.test.ts`

**Interfaces:**
- Produces, on `SGNode<R>`:
  - `ancestors(): SGNode<R>[]` — all transitive parents, deduped by node,
    excluding self; no order guarantee.
  - `descendants(): SGNode<R>[]` — all transitive children, deduped, excl. self.
  - `leaves(): SGNode<R>[]` — leaf descendants; `[this]` if childless.
  - `pedigree(): SGNode<R>[]` — root→…→this along `parents[0]`, incl. self,
    incl. synthetic root.
  - `path(): unknown[]` — pedigree keys, synthetic root excluded.
  - `namePath(sep = '/'): string` — pedigree labels, synthetic root excluded.

- [ ] **Step 1: Write the failing test** — `test/node-nav.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** — expect FAIL: `drug.ancestors is not a function`.

- [ ] **Step 3: Implement** — add to `class SGNode<R>` in `src/node.ts`:

```ts
  ancestors(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const stack = [...this.parents]
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      stack.push(...n.parents)
    }
    return out
  }

  descendants(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const stack = [...this.children]
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      stack.push(...n.children)
    }
    return out
  }

  leaves(): SGNode<R>[] {
    if (!this.children.length) return [this]
    return this.descendants().filter(n => !n.children.length)
  }

  pedigree(): SGNode<R>[] {
    const out: SGNode<R>[] = [this]
    let n: SGNode<R> = this
    while (n.parents[0]) { n = n.parents[0]; out.unshift(n) }
    return out
  }

  path(): unknown[] { return this.pedigree().filter(n => !n.synthetic).map(n => n.key) }

  namePath(sep = '/'): string {
    return this.pedigree().filter(n => !n.synthetic).map(n => n.label).join(sep)
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/node-nav.test.ts` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/node.ts test/node-nav.test.ts
git commit -m "v2: node navigation (ancestors/descendants/leaves/pedigree/paths)"
```

---

### Task 6: Aggregates + selection helpers

**Files:**
- Create: `src/selection.ts`
- Modify: `src/node.ts` (agg, pct, rollup)
- Test: `test/agg.test.ts`

**Interfaces:**
- Produces:
  - `src/selection.ts`: `recordsFor<R>(nodes: SGNode<R>[]): R[]` (union of
    `.records`, deduped by record identity, node list deduped first) and
    `recordsUnder<R>(nodes: SGNode<R>[]): R[]` (same, including all
    descendants — **union-then-aggregate discipline**).
  - On `SGNode<R>`: `agg(accessor: (r: R) => number): Agg` where
    `interface Agg { count: number; sum: number; mean: number; min: number; max: number }`
    (empty records → `{count: 0, sum: 0, mean: NaN, min: NaN, max: NaN}`);
    `pct(): number` = `records.length / ctx.totalRecords`;
    `rollup(accessor?): { count: number } & Partial<Agg>` — unions
    `recordsUnder([this])` first, then aggregates.

- [ ] **Step 1: Write the failing test** — `test/agg.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run** — expect FAIL: cannot resolve `../src/selection`.

- [ ] **Step 3: Implement**

`src/selection.ts`:

```ts
import type { SGNode } from './node'

export function recordsFor<R>(nodes: SGNode<R>[]): R[] {
  const seen = new Set<R>()
  const out: R[] = []
  for (const n of new Set(nodes)) {
    for (const r of n.records) {
      if (seen.has(r)) continue
      seen.add(r)
      out.push(r)
    }
  }
  return out
}

export function recordsUnder<R>(nodes: SGNode<R>[]): R[] {
  const all = new Set<SGNode<R>>()
  for (const n of nodes) {
    all.add(n)
    for (const d of n.descendants()) all.add(d)
  }
  return recordsFor([...all])
}
```

Add to `src/node.ts` — at top: `import { recordsUnder } from './selection'`
(type-only cycle-safe: `selection.ts` imports only the SGNode *type*), plus:

```ts
export interface Agg { count: number; sum: number; mean: number; min: number; max: number }

function aggregate<R>(records: R[], accessor: (r: R) => number): Agg {
  let sum = 0, min = Infinity, max = -Infinity
  for (const r of records) {
    const v = accessor(r)
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  const count = records.length
  return { count, sum, mean: count ? sum / count : NaN, min: count ? min : NaN, max: count ? max : NaN }
}
```

and methods on `SGNode<R>`:

```ts
  agg(accessor: (r: R) => number): Agg { return aggregate(this.records, accessor) }

  pct(): number { return this.records.length / this.ctx.totalRecords }

  /** union-then-aggregate over this node and all descendants; never sum-over-paths */
  rollup(accessor?: (r: R) => number): { count: number } & Partial<Agg> {
    const recs = recordsUnder([this])
    return accessor ? aggregate(recs, accessor) : { count: recs.length }
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/agg.test.ts` → PASS (5 tests).
Run: `npm run typecheck` → exits 0 (confirms the import cycle is type-clean).

- [ ] **Step 5: Commit**

```bash
git add src/selection.ts src/node.ts test/agg.test.ts
git commit -m "v2: agg/pct/rollup + stateless selection helpers"
```

---

### Task 7: Collection lookup, select, reindex + groupChildren

**Files:**
- Modify: `src/collection.ts` (node, select, reindex)
- Modify: `src/group.ts` (regroupNode)
- Modify: `src/node.ts` (groupChildren delegating to regroupNode)
- Modify: `test/group.test.ts` (switch the Task 3 placeholder line to `sg.node('b')`)
- Test: `test/collection.test.ts`

**Interfaces:**
- Produces:
  - `Supergroup.node(path: string | unknown[]): SGNode<R> | undefined` —
    string form splits on `'/'`; each segment matches a child where
    `child.key === seg || String(child.key) === String(seg)`; walks from
    `roots` level by level.
  - `Supergroup.select(arg: ((n: SGNode<R>) => boolean) | unknown[]): SGNode<R>[]` —
    predicate filters `nodes`; array matches `node.id` or `String(node.key)`.
  - `Supergroup.reindex(): void` — recomputes `nodes` (for post-construction
    `groupChildren` use).
  - `regroupNode<R>(node, dim, opts?): SGNode<R>[]` in `src/group.ts` —
    replaces `node.children` by grouping `node.records` by `dim` at
    `depth + 1`, ids prefixed `node.id + '/'` (no prefix for synthetic root).
  - `SGNode.groupChildren(dim, opts?)` → `regroupNode(this, dim, opts)`.

- [ ] **Step 1: Write the failing test** — `test/collection.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** — expect FAIL: `sg.node is not a function`.

- [ ] **Step 3: Implement**

In `src/collection.ts`, add methods (`computeNodes` stays private —
`reindex` is in the same class):

```ts
  node(path: string | unknown[]): SGNode<R> | undefined {
    const segs = typeof path === 'string' ? path.split('/') : path
    let level = this.roots
    let found: SGNode<R> | undefined
    for (const seg of segs) {
      found = level.find(n => n.key === seg || String(n.key) === String(seg))
      if (!found) return undefined
      level = found.children
    }
    return found
  }

  select(arg: ((n: SGNode<R>) => boolean) | unknown[]): SGNode<R>[] {
    if (typeof arg === 'function') return this.nodes.filter(n => arg(n))
    const wanted = new Set(arg.map(String))
    return this.nodes.filter(n => wanted.has(n.id) || wanted.has(String(n.key)))
  }

  /** refresh the DFS node index after post-construction structural edits */
  reindex(): void { this.nodes = this.computeNodes() }
```

In `src/group.ts`:

```ts
export function regroupNode<R>(node: SGNode<R>, dim: DimInput<R>, opts: GroupOpts<R> = {}): SGNode<R>[] {
  const [nd] = normalizeDims([dim])
  node.children = []
  const prefix = node.synthetic ? '' : `${node.id}/`
  return groupLevel(node.records, nd!, node, node.ctx, node.depth + 1, prefix, opts)
}
```

In `src/node.ts` — import `regroupNode` and `DimInput`/`GroupOpts` types from
`./group` and `./dims` (runtime circular import node↔group is safe: each
side only CALLS the other's function at method-invocation time), and add:

```ts
  groupChildren(dim: DimInput<R>, opts?: GroupOpts<R>): SGNode<R>[] {
    return regroupNode(this, dim, opts)
  }
```

In `test/group.test.ts`, restore the multi-dim assertion to
`expect(sg.node('b')!.records).toHaveLength(2)`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/collection.test.ts test/group.test.ts` → PASS.
Run: `npm run typecheck` → exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/collection.ts src/group.ts src/node.ts test/collection.test.ts test/group.test.ts
git commit -m "v2: node()/select()/reindex + groupChildren"
```

---

### Task 8: dag build — happy path (fromParentIds)

**Files:**
- Create: `src/dag/build.ts`
- Create: `src/dag/constructors.ts`
- Test: `test/dag.test.ts`

**Interfaces:**
- Consumes: `SGNode`, `SGContext`, `Supergroup`, `BackEdge`.
- Produces:
  - `interface DagItem { id: string; name?: string; parentIds?: string[] }`
  - `buildDag<R>(items: DagItem[]): Supergroup<R>` in `src/dag/build.ts` —
    node per item (`key = id`, `label = name ?? id`, `records = []`);
    duplicate ids throw; unknown parent ids ignored; duplicate parent→child
    pairs collapse; roots = in-degree-0 in item order; `depth` = min-depth
    (BFS). Cycle handling arrives in Task 9 — this task covers acyclic input.
  - `fromParentIds<R>(items: DagItem[]): Supergroup<R>` in
    `src/dag/constructors.ts` (calls `buildDag`; metrics wired in Task 10).

- [ ] **Step 1: Write the failing test** — `test/dag.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'

const ACYCLIC = [
  { id: 'A', name: 'Alpha' },
  { id: 'B', name: 'Beta', parentIds: ['A'] },
  { id: 'C', name: 'Gamma', parentIds: ['A'] },
  { id: 'D', name: 'Delta', parentIds: ['B', 'C'] },
]

describe('fromParentIds (acyclic)', () => {
  const sg = fromParentIds(ACYCLIC)

  it('builds multi-parent structure', () => {
    const d = sg.node(['A', 'B', 'D'])!
    expect(d.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
    expect(d.label).toBe('Delta')
    expect(sg.roots.map(r => r.id)).toEqual(['A'])
  })
  it('each node appears once in sg.nodes', () => {
    expect(sg.nodes).toHaveLength(4)
  })
  it('depth is MIN depth from any root', () => {
    const withShortcut = fromParentIds([...ACYCLIC, { id: 'X', parentIds: ['A', 'D'] }])
    expect(withShortcut.select(['X'])[0]!.depth).toBe(1)
  })
  it('ignores unknown parent ids; throws on duplicate ids', () => {
    const sg2 = fromParentIds([{ id: 'A', parentIds: ['ghost'] }])
    expect(sg2.roots.map(r => r.id)).toEqual(['A'])
    expect(() => fromParentIds([{ id: 'A' }, { id: 'A' }])).toThrow(/duplicate/)
  })
})
```

- [ ] **Step 2: Run** — expect FAIL: cannot resolve `../src/dag/constructors`.

- [ ] **Step 3: Implement**

`src/dag/build.ts`:

```ts
import { SGNode, type SGContext } from '../node'
import { Supergroup, type BackEdge } from '../collection'

export interface DagItem { id: string; name?: string; parentIds?: string[] }

export function buildDag<R>(items: DagItem[]): Supergroup<R> {
  const ctx: SGContext = { totalRecords: 0 }
  const byId = new Map<string, SGNode<R>>()
  for (const it of items) {
    if (byId.has(it.id)) throw new Error(`duplicate id: ${it.id}`)
    byId.set(it.id, new SGNode<R>({ id: it.id, key: it.id, label: it.name ?? it.id, ctx }))
  }

  const backedges: BackEdge<R>[] = []
  const childIds = new Map<string, string[]>()   // candidate edges, item order
  const indegree = new Map<string, number>(items.map(it => [it.id, 0]))
  const seenEdge = new Set<string>()
  for (const it of items) {
    for (const pid of it.parentIds ?? []) {
      const p = byId.get(pid)
      if (!p) continue                            // unknown parent ids ignored
      const ek = `${pid} ${it.id}`
      if (seenEdge.has(ek)) continue              // duplicate edges collapse
      seenEdge.add(ek)
      if (pid === it.id) {                        // self-loop → backedge
        backedges.push({ parent: p, child: p })
        continue
      }
      const arr = childIds.get(pid)
      if (arr) arr.push(it.id); else childIds.set(pid, [it.id])
      indegree.set(it.id, (indegree.get(it.id) ?? 0) + 1)
    }
  }

  // DFS edge classification: cycle-closing edges → backedges; rest wired.
  const visited = new Set<string>()
  const onStack = new Set<string>()
  const dfs = (startId: string): void => {
    const stack: [string, number][] = [[startId, 0]]
    visited.add(startId)
    onStack.add(startId)
    while (stack.length) {
      const frame = stack[stack.length - 1]!
      const kids = childIds.get(frame[0]) ?? []
      if (frame[1] >= kids.length) { onStack.delete(frame[0]); stack.pop(); continue }
      const cid = kids[frame[1]++]!
      const p = byId.get(frame[0])!
      const c = byId.get(cid)!
      if (onStack.has(cid)) {
        backedges.push({ parent: p, child: c })
      } else {
        p.children.push(c)
        c.parents.push(p)
        if (!visited.has(cid)) { visited.add(cid); onStack.add(cid); stack.push([cid, 0]) }
      }
    }
  }

  const roots: SGNode<R>[] = []
  for (const it of items) if ((indegree.get(it.id) ?? 0) === 0) roots.push(byId.get(it.id)!)
  for (const r of roots) if (!visited.has(r.id)) dfs(r.id)
  // rootless cycle regions: promote the first unvisited node (item order)
  for (const it of items) {
    if (!visited.has(it.id)) { roots.push(byId.get(it.id)!); dfs(it.id) }
  }

  // min-depth by BFS over kept edges
  const seen = new Set(roots.map(r => r.id))
  const queue = [...roots]
  for (const r of roots) r.depth = 0
  while (queue.length) {
    const n = queue.shift()!
    for (const c of n.children) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      c.depth = n.depth + 1
      queue.push(c)
    }
  }

  return new Supergroup<R>(roots, { backedges, ctx })
}
```

`src/dag/constructors.ts`:

```ts
import { buildDag, type DagItem } from './build'
import type { Supergroup } from '../collection'

export function fromParentIds<R>(items: DagItem[]): Supergroup<R> {
  return buildDag<R>(items)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/dag.test.ts` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dag/build.ts src/dag/constructors.ts test/dag.test.ts
git commit -m "v2: dag build — fromParentIds happy path, min-depth"
```

---

### Task 9: dag cycles — self-loops, backedges, rootless regions

**Files:**
- Modify: `src/dag/build.ts` (only if a test fails — Task 8's implementation
  already contains the cycle discipline; this task LOCKS it with tests)
- Test: `test/dag-cycles.test.ts`

**Interfaces:**
- Produces verified semantics: self-loops and cycle-closing edges land in
  `sg.backedges` and are excluded from `parents`/`children`; every node of a
  rootless cycle region is reachable (first member in item order gets
  promoted to `roots`); all traversals terminate.

- [ ] **Step 1: Write the failing test** — `test/dag-cycles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { DAG_ITEMS } from './fixtures'

describe('cycle discipline', () => {
  const sg = fromParentIds(DAG_ITEMS)

  it('nothing vanishes: all 7 nodes present', () => {
    expect(sg.nodes).toHaveLength(7)
  })
  it('self-loop on E is a backedge, not a parent', () => {
    const e = sg.select(['E'])[0]!
    expect(e.parents.map(p => p.id)).toEqual(['B'])
    expect(sg.backedges.some(b => b.parent.id === 'E' && b.child.id === 'E')).toBe(true)
  })
  it('rootless cycle F<->G: F promoted to root, G→F edge kept, F→... backedge recorded', () => {
    expect(sg.roots.map(r => r.id)).toEqual(['A', 'F'])
    const g = sg.select(['G'])[0]!
    expect(g.parents.map(p => p.id)).toEqual(['F'])
    expect(sg.backedges.some(b => b.parent.id === 'G' && b.child.id === 'F')).toBe(true)
  })
  it('traversals terminate and dedup on cyclic input', () => {
    const f = sg.select(['F'])[0]!
    expect(f.descendants().map(n => n.id)).toEqual(['G'])
    expect(f.ancestors()).toEqual([])
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run test/dag-cycles.test.ts`

Expected: PASS if Task 8's implementation is correct; any FAIL here is a bug
in `buildDag` — fix within the algorithm as specified in Task 8's Step 3
(the classification/promotion loops), not by special-casing tests.

- [ ] **Step 3: Run full suite** — `npx vitest run` → all green.

- [ ] **Step 4: Commit**

```bash
git add test/dag-cycles.test.ts src/dag/build.ts
git commit -m "v2: lock dag cycle discipline (self-loops, backedges, rootless regions)"
```

---

### Task 10: dag metrics (maxDepth, height)

**Files:**
- Create: `src/dag/metrics.ts`
- Modify: `src/dag/constructors.ts` (wire into `fromParentIds`)
- Test: `test/dag-metrics.test.ts`

**Interfaces:**
- Produces: `computeMetrics<R>(sg: Supergroup<R>): void` — fills
  `node.maxDepth` (longest path from any root) and `node.height` (longest
  path down to a leaf) for every node, via Kahn topological order over kept
  edges (kept edges are acyclic by Task 9). `fromParentIds` now calls it —
  metrics are EAGER per the spec.

- [ ] **Step 1: Write the failing test** — `test/dag-metrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'

// A→B→C→D and A→D shortcut: D minDepth 1, maxDepth 3
const ITEMS = [
  { id: 'A' },
  { id: 'B', parentIds: ['A'] },
  { id: 'C', parentIds: ['B'] },
  { id: 'D', parentIds: ['C', 'A'] },
]

describe('dag metrics', () => {
  const sg = fromParentIds(ITEMS)
  const get = (id: string) => sg.select([id])[0]!

  it('maxDepth is the longest path from a root', () => {
    expect(get('D').depth).toBe(1)
    expect(get('D').maxDepth).toBe(3)
    expect(get('A').maxDepth).toBe(0)
  })
  it('height is the longest path down to a leaf', () => {
    expect(get('A').height).toBe(3)
    expect(get('D').height).toBe(0)
  })
})
```

- [ ] **Step 2: Run** — expect FAIL: `maxDepth` is `undefined`.

- [ ] **Step 3: Implement**

`src/dag/metrics.ts`:

```ts
import type { SGNode } from '../node'
import type { Supergroup } from '../collection'

export function computeMetrics<R>(sg: Supergroup<R>): void {
  const indeg = new Map<SGNode<R>, number>(sg.nodes.map(n => [n, 0]))
  for (const n of sg.nodes) for (const c of n.children) indeg.set(c, (indeg.get(c) ?? 0) + 1)
  const queue = sg.nodes.filter(n => (indeg.get(n) ?? 0) === 0)
  const topo: SGNode<R>[] = []
  while (queue.length) {
    const n = queue.shift()!
    topo.push(n)
    for (const c of n.children) {
      const d = (indeg.get(c) ?? 0) - 1
      indeg.set(c, d)
      if (d === 0) queue.push(c)
    }
  }
  for (const n of topo) {
    n.maxDepth = n.parents.length ? Math.max(...n.parents.map(p => p.maxDepth ?? 0)) + 1 : 0
  }
  for (let i = topo.length - 1; i >= 0; i--) {
    const n = topo[i]!
    n.height = n.children.length ? Math.max(...n.children.map(c => c.height ?? 0)) + 1 : 0
  }
}
```

In `src/dag/constructors.ts`, wire it:

```ts
import { computeMetrics } from './metrics'

export function fromParentIds<R>(items: DagItem[]): Supergroup<R> {
  const sg = buildDag<R>(items)
  computeMetrics(sg)
  return sg
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/dag-metrics.test.ts test/dag.test.ts test/dag-cycles.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dag/metrics.ts src/dag/constructors.ts test/dag-metrics.test.ts
git commit -m "v2: eager dag metrics (maxDepth, height)"
```

---

### Task 11: fromEdges + fromParentChild

**Files:**
- Modify: `src/dag/constructors.ts`
- Test: `test/dag-constructors.test.ts`

**Interfaces:**
- Produces:
  - `fromEdges<R>(edges: [string, string][], nodes?: { id: string; name?: string }[]): Supergroup<R>` —
    edges are `[parentId, childId]`; ids appearing only in edges are
    auto-created with `label = id`; order = first appearance (nodes list
    first, then edge order).
  - `fromParentChild<R, Row>(rows: Row[], opts: { parent: string | ((row: Row) => unknown); child: string | ((row: Row) => unknown); label?: string | ((row: Row) => string) }): Supergroup<R>` —
    the `hierarchicalTableToTree` successor. `parent`/`child`/`label` are
    column names or accessors; a null/undefined/empty parent value means
    "no parent edge from this row". Both delegate to `fromParentIds`
    (single build pipeline, cycle-safe, metrics included, non-quadratic).

- [ ] **Step 1: Write the failing test** — `test/dag-constructors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fromEdges, fromParentChild } from '../src/dag/constructors'

describe('fromEdges', () => {
  it('builds from [parent, child] pairs, auto-creating nodes', () => {
    const sg = fromEdges([['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']])
    expect(sg.roots.map(r => r.id)).toEqual(['A'])
    expect(sg.select(['D'])[0]!.parents.map(p => p.id).sort()).toEqual(['B', 'C'])
  })
  it('uses the nodes list for labels', () => {
    const sg = fromEdges([['a', 'b']], [{ id: 'a', name: 'Ay' }, { id: 'b', name: 'Bee' }])
    expect(sg.roots[0]!.label).toBe('Ay')
  })
})

describe('fromParentChild', () => {
  const ROWS = [
    { p: null, c: 'root1', nm: 'Root One' },
    { p: 'root1', c: 'kid', nm: 'Kid' },
    { p: 'root1', c: 'kid2', nm: 'Kid Two' },
    { p: 'kid', c: 'gk', nm: 'Grandkid' },
    { p: 'kid2', c: 'gk', nm: 'Grandkid' },     // polyhierarchy: gk under 2 parents
  ]
  it('builds a polyhierarchy from a parent/child table', () => {
    const sg = fromParentChild(ROWS, { parent: 'p', child: 'c', label: 'nm' })
    expect(sg.roots.map(r => r.id)).toEqual(['root1'])
    const gk = sg.select(['gk'])[0]!
    expect(gk.parents.map(p => p.id).sort()).toEqual(['kid', 'kid2'])
    expect(gk.label).toBe('Grandkid')
  })
})
```

- [ ] **Step 2: Run** — expect FAIL: `fromEdges` not exported.

- [ ] **Step 3: Implement** — add to `src/dag/constructors.ts`:

```ts
export function fromEdges<R>(
  edges: [string, string][],
  nodes?: { id: string; name?: string }[],
): Supergroup<R> {
  const items = new Map<string, DagItem>()
  for (const n of nodes ?? []) items.set(n.id, { id: n.id, name: n.name, parentIds: [] })
  const ensure = (id: string): DagItem => {
    let it = items.get(id)
    if (!it) { it = { id, parentIds: [] }; items.set(id, it) }
    return it
  }
  for (const [pid, cid] of edges) {
    ensure(pid)
    ensure(cid).parentIds!.push(pid)
  }
  return fromParentIds<R>([...items.values()])
}

export function fromParentChild<R, Row>(
  rows: Row[],
  opts: {
    parent: string | ((row: Row) => unknown)
    child: string | ((row: Row) => unknown)
    label?: string | ((row: Row) => string)
  },
): Supergroup<R> {
  const col = <T>(spec: string | ((row: Row) => T)) =>
    typeof spec === 'string' ? (row: Row) => (row as Record<string, unknown>)[spec] as T : spec
  const parentOf = col(opts.parent)
  const childOf = col(opts.child)
  const labelOf = opts.label ? col(opts.label) : undefined
  const items = new Map<string, DagItem>()
  const ensure = (id: string): DagItem => {
    let it = items.get(id)
    if (!it) { it = { id, parentIds: [] }; items.set(id, it) }
    return it
  }
  for (const row of rows) {
    const cid = String(childOf(row))
    const it = ensure(cid)
    if (labelOf) it.name = String(labelOf(row))
    const pRaw = parentOf(row)
    if (pRaw == null || pRaw === '') continue
    const pid = String(pRaw)
    ensure(pid)
    it.parentIds!.push(pid)
  }
  return fromParentIds<R>([...items.values()])
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/dag-constructors.test.ts` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dag/constructors.ts test/dag-constructors.test.ts
git commit -m "v2: fromEdges + fromParentChild (hierarchicalTableToTree successor)"
```

---

### Task 12: attachRecords + union rollup over a DAG (M1 acceptance semantics)

**Files:**
- Create: `src/dag/records.ts`
- Test: `test/dag-records.test.ts`

**Interfaces:**
- Produces:
  `attachRecords<R>(sg: Supergroup<R>, records: R[], byKey: (r: R) => string | string[] | null | undefined): { matched: number; unmatched: R[] }` —
  pushes each record onto every matched node's `records` (multi-id hits
  deduped per record); unmatched records returned; adds `records.length` to
  `sg.ctx.totalRecords` (so `pct()` works on dag collections).

- [ ] **Step 1: Write the failing test** — `test/dag-records.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run** — expect FAIL: cannot resolve `../src/dag/records`.

- [ ] **Step 3: Implement** — `src/dag/records.ts`:

```ts
import type { SGNode } from '../node'
import type { Supergroup } from '../collection'

export function attachRecords<R>(
  sg: Supergroup<R>,
  records: R[],
  byKey: (r: R) => string | string[] | null | undefined,
): { matched: number; unmatched: R[] } {
  const byId = new Map(sg.nodes.map(n => [n.id, n]))
  const unmatched: R[] = []
  let matched = 0
  for (const r of records) {
    const raw = byKey(r)
    const ids = raw == null ? [] : Array.isArray(raw) ? raw : [raw]
    const hits = new Set<SGNode<R>>()
    for (const id of ids) {
      const n = byId.get(id)
      if (n) hits.add(n)
    }
    if (!hits.size) { unmatched.push(r); continue }
    matched++
    for (const n of hits) n.records.push(r)
  }
  sg.ctx.totalRecords += records.length
  return { matched, unmatched }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/dag-records.test.ts` → PASS (3 tests). The middle
test is the milestone's named acceptance criterion ("union rollup correct on
a multi-parent fixture").

- [ ] **Step 5: Commit**

```bash
git add src/dag/records.ts test/dag-records.test.ts
git commit -m "v2: attachRecords; union-then-aggregate rollup verified on diamond DAG"
```

---

### Task 13: subgraph

**Files:**
- Create: `src/dag/subgraph.ts`
- Test: `test/dag-subgraph.test.ts`

**Interfaces:**
- Produces: `subgraph<R>(sg: Supergroup<R>, ids: Iterable<string>): Supergroup<R>` —
  induced sub-collection: clones kept nodes (records shared by reference,
  `records` array copied), keeps edges with BOTH endpoints kept (backedges
  included, re-filtered), roots = kept nodes with no kept parents, min-depth
  re-BFS'd, metrics recomputed, `ctx.totalRecords` = distinct records across
  kept nodes. Function form (not `sg.subgraph()`) to keep the core module
  dag-free — Task 15 records this as a spec amendment.

- [ ] **Step 1: Write the failing test** — `test/dag-subgraph.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { attachRecords } from '../src/dag/records'
import { subgraph } from '../src/dag/subgraph'
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
})
```

- [ ] **Step 2: Run** — expect FAIL: cannot resolve `../src/dag/subgraph`.

- [ ] **Step 3: Implement** — `src/dag/subgraph.ts`:

```ts
import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'
import { recordsFor } from '../selection'
import { computeMetrics } from './metrics'

export function subgraph<R>(sg: Supergroup<R>, ids: Iterable<string>): Supergroup<R> {
  const keep = new Set(ids)
  const ctx: SGContext = { totalRecords: 0 }
  const clone = new Map<string, SGNode<R>>()
  for (const n of sg.nodes) {
    if (!keep.has(n.id)) continue
    clone.set(n.id, new SGNode<R>({
      id: n.id, key: n.key, label: n.label, dim: n.dim, records: [...n.records], ctx,
    }))
  }
  for (const n of sg.nodes) {
    const c1 = clone.get(n.id)
    if (!c1) continue
    for (const ch of n.children) {
      const c2 = clone.get(ch.id)
      if (c2) { c1.children.push(c2); c2.parents.push(c1) }
    }
  }
  const backedges = sg.backedges
    .filter(e => keep.has(e.parent.id) && keep.has(e.child.id))
    .map(e => ({ parent: clone.get(e.parent.id)!, child: clone.get(e.child.id)! }))
  const roots = [...clone.values()].filter(n => !n.parents.length)
  // min-depth BFS over kept edges
  const seen = new Set(roots.map(r => r.id))
  const queue = [...roots]
  for (const r of roots) r.depth = 0
  while (queue.length) {
    const n = queue.shift()!
    for (const c of n.children) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      c.depth = n.depth + 1
      queue.push(c)
    }
  }
  ctx.totalRecords = recordsFor([...clone.values()]).length
  const sub = new Supergroup<R>(roots, { backedges, ctx })
  computeMetrics(sub)
  return sub
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/dag-subgraph.test.ts` → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/dag/subgraph.ts test/dag-subgraph.test.ts
git commit -m "v2: induced subgraph over a node set"
```

---

### Task 14: toDagBrowserNodes adapter

**Files:**
- Create: `src/adapters/dagBrowser.ts`
- Test: `test/adapters.test.ts`

**Interfaces:**
- Produces:
  - `interface DagBrowserNode { id: string; name: string; parentIds: string[] }`
  - `toDagBrowserNodes<R>(sg: Supergroup<R>): DagBrowserNode[]` — one entry
    per node in `sg.nodes` order; synthetic roots excluded (and excluded from
    `parentIds`); **backedges re-included** as parent links (DBW does its own
    cycle marking). Duck-shaped output — no dag-browser-widget import.

- [ ] **Step 1: Write the failing test** — `test/adapters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { fromParentIds } from '../src/dag/constructors'
import { supergroup } from '../src/group'
import { toDagBrowserNodes } from '../src/adapters/dagBrowser'
import { DAG_ITEMS, RXS } from './fixtures'

describe('toDagBrowserNodes', () => {
  it('emits {id, name, parentIds} with backedges re-included', () => {
    const out = toDagBrowserNodes(fromParentIds(DAG_ITEMS))
    const byId = new Map(out.map(n => [n.id, n]))
    expect(out).toHaveLength(7)
    expect(byId.get('D')!.parentIds.sort()).toEqual(['B', 'C'])
    expect(byId.get('E')!.parentIds.sort()).toEqual(['B', 'E'])   // self-loop restored
    expect(byId.get('F')!.parentIds).toEqual(['G'])               // cycle edge restored
    expect(byId.get('A')!.parentIds).toEqual([])
    expect(byId.get('A')!.name).toBe('Alpha')
  })
  it('works on grouped trees (path ids) and skips synthetic roots', () => {
    const out = toDagBrowserNodes(supergroup(RXS, ['vocab', 'domain'], { root: 'synthetic' }))
    expect(out.find(n => n.id === '(root)')).toBeUndefined()
    expect(out.find(n => n.id === 'RxNorm')!.parentIds).toEqual([])
    expect(out.find(n => n.id === 'RxNorm/Drug')!.parentIds).toEqual(['RxNorm'])
  })
})
```

- [ ] **Step 2: Run** — expect FAIL: cannot resolve `../src/adapters/dagBrowser`.

- [ ] **Step 3: Implement** — `src/adapters/dagBrowser.ts`:

```ts
import type { Supergroup } from '../collection'

export interface DagBrowserNode { id: string; name: string; parentIds: string[] }

export function toDagBrowserNodes<R>(sg: Supergroup<R>): DagBrowserNode[] {
  const backParents = new Map<string, string[]>()
  for (const { parent, child } of sg.backedges) {
    const arr = backParents.get(child.id)
    if (arr) arr.push(parent.id); else backParents.set(child.id, [parent.id])
  }
  return sg.nodes
    .filter(n => !n.synthetic)
    .map(n => ({
      id: n.id,
      name: n.label,
      parentIds: [
        ...n.parents.filter(p => !p.synthetic).map(p => p.id),
        ...(backParents.get(n.id) ?? []),
      ],
    }))
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/adapters.test.ts` → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/adapters/dagBrowser.ts test/adapters.test.ts
git commit -m "v2: toDagBrowserNodes adapter (duck-shaped DBW input)"
```

---

### Task 15: Public exports, spec amendments, full gate

**Files:**
- Modify: `src/index.ts`
- Create: `src/dag/index.ts`
- Create: `src/adapters/index.ts`
- Modify: `docs/specs/2026-07-13-supergroup-v2-design.md` (two amendments)
- Test: `test/exports.test.ts`

**Interfaces:**
- Produces the three public entry points later packaging maps to subpath
  exports (`supergroup`, `supergroup/dag`, `supergroup/adapters`).

- [ ] **Step 1: Write the failing test** — `test/exports.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as core from '../src/index'
import * as dag from '../src/dag/index'
import * as adapters from '../src/adapters/index'

describe('public export surfaces', () => {
  it('core', () => {
    for (const name of ['supergroup', 'Supergroup', 'SGNode', 'normalizeDims', 'recordsFor', 'recordsUnder', 'regroupNode'])
      expect(core, name).toHaveProperty(name)
  })
  it('dag', () => {
    for (const name of ['fromParentIds', 'fromEdges', 'fromParentChild', 'attachRecords', 'subgraph', 'computeMetrics', 'buildDag'])
      expect(dag, name).toHaveProperty(name)
  })
  it('adapters', () => {
    expect(adapters).toHaveProperty('toDagBrowserNodes')
  })
})
```

- [ ] **Step 2: Run** — expect FAIL (core exports only `VERSION`).

- [ ] **Step 3: Implement**

`src/index.ts`:

```ts
export const VERSION = '2.0.0-dev'
export { SGNode } from './node'
export type { SGContext, SGNodeInit, Agg } from './node'
export { Supergroup } from './collection'
export type { BackEdge } from './collection'
export { supergroup, groupLevel, regroupNode } from './group'
export type { GroupOpts } from './group'
export { normalizeDims } from './dims'
export type { DimAccessor, DimSpec, DimInput, NormalDim } from './dims'
export { recordsFor, recordsUnder } from './selection'
```

`src/dag/index.ts`:

```ts
export { buildDag } from './build'
export type { DagItem } from './build'
export { fromParentIds, fromEdges, fromParentChild } from './constructors'
export { computeMetrics } from './metrics'
export { attachRecords } from './records'
export { subgraph } from './subgraph'
```

`src/adapters/index.ts`:

```ts
export { toDagBrowserNodes } from './dagBrowser'
export type { DagBrowserNode } from './dagBrowser'
```

- [ ] **Step 4: Amend the spec** (implementation taught us two things)

In `docs/specs/2026-07-13-supergroup-v2-design.md`:
1. Change `sg.subgraph(ids)` to `subgraph(sg, ids)` — sentence becomes:
   "`subgraph(sg, ids)` (supergroup/dag) — induced sub-DAG over a node set
   (the vs-hub value-set case), returning a new collection. A function, not
   a method, so the core module stays dag-free."
2. In the cycle-discipline paragraph, change "plus one synthetic root
   promoted per rootless cycle region" to "plus, per rootless cycle region,
   its first member (input order) promoted to a root".

- [ ] **Step 5: Full gate**

Run: `npx vitest run` → all test files PASS.
Run: `npm run typecheck` → exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/dag/index.ts src/adapters/index.ts test/exports.test.ts docs/specs/2026-07-13-supergroup-v2-design.md
git commit -m "v2: public export surfaces; spec amendments (subgraph fn, root promotion)"
```

---

## Post-M1 (not in this plan)

Packaging (`exports` map, dist build, `legacy/` move, 2.0.0 publish) and the
dmvd CLAUDE.md pointer happen after M1 review. M2 (sequence + toD3) and M3
(compare) get their own plans.
