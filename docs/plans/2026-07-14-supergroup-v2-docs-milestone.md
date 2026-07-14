# supergroup v2 — Docs Milestone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship supergroup 2.0.0: clear the deferred-minors publish gate, real
packaging (`exports` map + dist build), a live demo/documentation site served
from `docs/` on master, a rewritten README, the `legacy/` move, the npm
publish, and the post-publish pointer notes — per
[the approved spec](../specs/2026-07-14-supergroup-v2-docs-milestone-design.md).

**Architecture:** The site is a single static page (`docs/index.html`) with
editable live-code cells (CodeMirror via esm.sh import map) that evaluate
against a **committed vendored copy** of the built dist
(`docs/vendor/supergroup/`), so the page works locally and on GitHub Pages
with no build step and no dependency on the npm publish. GitHub Pages serves
master `/docs` via the built-in "deploy from a branch" setting.

**Tech Stack:** TypeScript (strict), vitest, tsc build to `dist/` (ESM +
`.d.ts`). Site: plain HTML/JS/CSS; d3, CodeMirror, react, and
dag-browser-widget from esm.sh/jsdelivr CDNs. No bundler, no CI.

## Global Constraints

- **Zero runtime dependencies** (devDependencies only: `typescript`, `vitest`).
- **Strict TS, no `any`** (use `unknown` + narrowing).
- **Union-then-aggregate, never sum-over-paths.**
- **The core never materializes path-rows.**
- **Site voice**: neutral, close to the old README's register — no
  late-night-infomercial enthusiasm. Candidate material from the gh-pages doc
  and the Toptal article is *proposed to SG for review*, never grabbed
  wholesale.
- **Commit after every task**; never push, never publish without SG's
  explicit go-ahead.
- Executor shell notes: `ls`/`rm`/`cp`/`mv` are aliased on this machine —
  use `/bin/ls`, `/bin/rm`, `/bin/cp`, `/bin/mv` in Bash steps; `noclobber`
  is set (`>` won't overwrite existing files). npm scripts run under `sh`
  and are unaffected.

---

## Task 1: id collision — distinct ids for keys that stringify alike

Numeric `1` and string `'1'` under one dim currently produce two nodes with
identical `id` (`idPrefix + String(key)`), so `toDagBrowserNodes` emits
duplicate ids and id-keyed maps keep the last node. Fix: per-level id
de-duplication with a deterministic `~2`, `~3`… suffix (record order).

**Files:**
- Modify: `src/group.ts` (function `groupLevel`, lines ~28-45)
- Test: `test/group.test.ts` (add tests)

**Interfaces:**
- Consumes: existing `groupLevel` internals.
- Produces: no signature changes; `SGNode.id` values are now unique per
  level. Later tasks (site cells, adapters) rely on ids being unique.

- [ ] **Step 1: Write the failing tests**

Add to `test/group.test.ts`:

```ts
test('keys that stringify alike get distinct ids', () => {
  const sg = supergroup([{ x: 1 }, { x: '1' }], 'x')
  expect(sg.roots).toHaveLength(2)
  expect(new Set(sg.roots.map(n => n.id)).size).toBe(2)
})

test('id disambiguation is deterministic and prefix-scoped', () => {
  const sg = supergroup([{ x: 1 }, { x: '1' }, { x: 1 }], 'x')
  const ids = sg.roots.map(n => n.id)
  expect(ids[0]).toBe('1')      // first occurrence keeps the plain id
  expect(ids[1]).toBe('1~2')    // second gets the suffix
})
```

(If `test/group.test.ts` imports `supergroup` from `'../src/group'`, these
tests slot in as-is; match the file's existing import.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/group.test.ts`
Expected: the two new tests FAIL (both nodes currently get id `'1'`).

- [ ] **Step 3: Implement per-level id de-dup in `groupLevel`**

In `src/group.ts`, inside `groupLevel`, add a `usedIds` set and disambiguate
on collision. The changed region:

```ts
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
  const usedIds = new Set<string>()
  for (const r of records) {
    const raw = dim.accessor(r)
    const keys = dim.multi && Array.isArray(raw) ? raw : [raw]
    for (const key of keys) {
      if (isExcluded(key, opts.excludeValues)) continue
      const mk = mapKey(key)
      let node = byKey.get(mk)
      if (!node) {
        // distinct keys can stringify alike (1 vs '1'); ids must stay unique
        let id = idPrefix + String(key)
        for (let i = 2; usedIds.has(id); i++) id = `${idPrefix + String(key)}~${i}`
        usedIds.add(id)
        node = new SGNode<R>({ id, key, label: String(key), dim: dim.name, depth, ctx })
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
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run` → ALL green. `npm run typecheck` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/group.ts test/group.test.ts
git commit -m "v2: disambiguate node ids when distinct keys stringify alike"
```

---

## Task 2: shared BFS/queue helper (`Fifo`, `assignMinDepths`)

`queue.shift()` on a plain array is O(n²)-worst in `build.ts`, `metrics.ts`,
and `subgraph.ts`, and the min-depth BFS is duplicated verbatim in
`build.ts`/`subgraph.ts`. Extract both into `src/dag/traverse.ts`.

**Files:**
- Create: `src/dag/traverse.ts`
- Modify: `src/dag/build.ts` (BFS block, lines ~69-80),
  `src/dag/metrics.ts` (topo queue), `src/dag/subgraph.ts` (BFS block,
  lines ~28-39)
- Test: `test/dag-traverse.test.ts` (new, small unit tests; the existing dag
  suite is the real gate)

**Interfaces:**
- Produces: `class Fifo<T> { push(x: T): void; shift(): T | undefined; get length(): number }`
  and `function assignMinDepths<R>(roots: SGNode<R>[]): void` (sets
  `depth = 0` on roots, min-depth over children edges elsewhere; dedups by
  node `id`). Task 3 calls `assignMinDepths` with the root clone included.

- [ ] **Step 1: Write the failing unit tests**

Create `test/dag-traverse.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/dag-traverse.test.ts`
Expected: FAIL — `src/dag/traverse` does not exist.

- [ ] **Step 3: Create `src/dag/traverse.ts`**

```ts
import type { SGNode } from '../node'

/** FIFO queue with amortized O(1) shift (array + head index) */
export class Fifo<T> {
  private items: (T | undefined)[] = []
  private head = 0
  push(x: T): void { this.items.push(x) }
  shift(): T | undefined {
    if (this.head >= this.items.length) return undefined
    const x = this.items[this.head]
    this.items[this.head++] = undefined
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head)
      this.head = 0
    }
    return x
  }
  get length(): number { return this.items.length - this.head }
}

/** min-depth BFS over children edges; roots get depth 0 (dedup by node id) */
export function assignMinDepths<R>(roots: SGNode<R>[]): void {
  const seen = new Set(roots.map(r => r.id))
  const queue = new Fifo<SGNode<R>>()
  for (const r of roots) { r.depth = 0; queue.push(r) }
  let n: SGNode<R> | undefined
  while ((n = queue.shift())) {
    for (const c of n.children) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      c.depth = n.depth + 1
      queue.push(c)
    }
  }
}
```

- [ ] **Step 4: Use it in build.ts, subgraph.ts, metrics.ts**

`src/dag/build.ts` — add `import { assignMinDepths } from './traverse'` and
replace the whole `// min-depth by BFS over kept edges` block (the
`seen`/`queue`/`while` lines just before the return) with:

```ts
  assignMinDepths(roots)
```

`src/dag/subgraph.ts` — add the same import and replace its
`// min-depth BFS over kept edges` block (`seen`/`queue`/`while`) with:

```ts
  assignMinDepths(roots)
```

`src/dag/metrics.ts` — add `import { Fifo } from './traverse'` and replace
the queue construction and loop:

```ts
export function computeMetrics<R>(sg: Supergroup<R>): void {
  const indeg = new Map<SGNode<R>, number>(sg.nodes.map(n => [n, 0]))
  for (const n of sg.nodes) for (const c of n.children) indeg.set(c, (indeg.get(c) ?? 0) + 1)
  const queue = new Fifo<SGNode<R>>()
  for (const n of sg.nodes) if ((indeg.get(n) ?? 0) === 0) queue.push(n)
  const topo: SGNode<R>[] = []
  let n: SGNode<R> | undefined
  while ((n = queue.shift())) {
    topo.push(n)
    for (const c of n.children) {
      const d = (indeg.get(c) ?? 0) - 1
      indeg.set(c, d)
      if (d === 0) queue.push(c)
    }
  }
  // (maxDepth / height passes below unchanged)
```

Also export from `src/dag/index.ts` (internal helper, but harmless and
testable): add

```ts
export { Fifo, assignMinDepths } from './traverse'
```

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run` → ALL green (dag tests exercise both BFS call sites).
`npm run typecheck` → 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/dag/traverse.ts src/dag/build.ts src/dag/metrics.ts src/dag/subgraph.ts src/dag/index.ts test/dag-traverse.test.ts
git commit -m "v2: shared Fifo/assignMinDepths dag traversal helpers"
```

---

## Task 3: `subgraph` keeps `synthetic`, `direction`, and the collection `root`

`subgraph` clones drop the node `synthetic` flag, the node `direction`, and
the collection-level `root` — so a subgraph of a synthetic-rooted collection
(e.g. anchored-both sequence output) silently loses root semantics and
backward paths come out forward.

**Files:**
- Modify: `src/dag/subgraph.ts`
- Test: `test/dag-subgraph.test.ts` (add tests)

**Interfaces:**
- Consumes: `assignMinDepths` from Task 2.
- Produces: `subgraph(sg, ids)` unchanged signature; result now has
  `.root` set when the source root's id is in `ids`, and clones carry
  `synthetic`/`direction`.

- [ ] **Step 1: Write the failing tests**

Add to `test/dag-subgraph.test.ts` (match its existing imports; it already
imports `subgraph`; add `supergroup` from `'../src/group'` and
`groupBySequence` from `'../src/sequence'` if not present):

```ts
test('subgraph keeps synthetic flag and collection root', () => {
  const recs = [{ a: 'x' }, { a: 'y' }]
  const sg = supergroup(recs, ['a'], { root: 'synthetic' })
  const sub = subgraph(sg, ['(root)', 'x'])
  expect(sub.root).toBeDefined()
  expect(sub.root!.synthetic).toBe(true)
  expect(sub.root!.children.map(n => n.label)).toEqual(['x'])
  expect(sub.roots).toHaveLength(0)          // root is not doubled into roots
  expect(sub.nodes.map(n => n.id)).toEqual(['(root)', 'x'])
})

test('subgraph keeps node direction (backward paths stay reversed)', () => {
  type Evt = { name: string; prev?: Evt }
  const e1: Evt = { name: 'start' }
  const e2: Evt = { name: 'end', prev: e1 }
  const sg = groupBySequence([e2], { key: 'name', prev: e => e.prev, direction: 'backward' })
  const leaf = sg.nodes.find(n => n.label === 'start')!
  expect(leaf.namePath()).toBe('start/end')  // reversed because backward
  const sub = subgraph(sg, sg.nodes.map(n => n.id))
  const subLeaf = sub.nodes.find(n => n.label === 'start')!
  expect(subLeaf.direction).toBe('backward')
  expect(subLeaf.namePath()).toBe('start/end')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/dag-subgraph.test.ts`
Expected: the two new tests FAIL (`sub.root` undefined; `direction`
undefined → namePath comes out `'end/start'`).

- [ ] **Step 3: Implement**

In `src/dag/subgraph.ts`, carry the flags in the clone init and wire the
root. Full updated function:

```ts
import { SGNode, type SGContext } from '../node'
import { Supergroup } from '../collection'
import { recordsFor } from '../selection'
import { computeMetrics } from './metrics'
import { assignMinDepths } from './traverse'

export function subgraph<R>(sg: Supergroup<R>, ids: Iterable<string>): Supergroup<R> {
  const keep = new Set(ids)
  const ctx: SGContext = { totalRecords: 0 }
  const clone = new Map<string, SGNode<R>>()
  for (const n of sg.nodes) {
    if (!keep.has(n.id)) continue
    clone.set(n.id, new SGNode<R>({
      id: n.id, key: n.key, label: n.label, dim: n.dim,
      records: [...n.records], synthetic: n.synthetic, direction: n.direction, ctx,
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
  const root = sg.root ? clone.get(sg.root.id) : undefined
  const roots = [...clone.values()].filter(n => !n.parents.length && n !== root)
  assignMinDepths(root ? [root, ...roots] : roots)
  ctx.totalRecords = recordsFor([...clone.values()]).length
  const sub = new Supergroup<R>(roots, { root, backedges, ctx })
  computeMetrics(sub)
  return sub
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run` → ALL green. `npm run typecheck` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/dag/subgraph.ts test/dag-subgraph.test.ts
git commit -m "v2: subgraph keeps synthetic/direction flags and collection root"
```

---

## Task 4: remaining deferred minors — re-export, doc comments, missing tests

The rest of the publish gate: `SGNodeLike` re-export, the three "document
this" items, and the missing test classes (empty inputs, type-level
inference, end-to-end `toDagBrowserNodes(subgraph(...))`).

**Files:**
- Modify: `src/index.ts`, `src/selection.ts`, `src/node.ts`,
  `src/dag/constructors.ts`
- Test: `test/collection.test.ts`, `test/dag-constructors.test.ts`,
  `test/adapters.test.ts` (add tests); Create: `test/types.test.ts`

**Interfaces:**
- Produces: `SGNodeLike` importable from the package root. No runtime
  changes.

- [ ] **Step 1: Write the failing/new tests**

Add to `test/collection.test.ts`:

```ts
test('supergroup of an empty record array', () => {
  const sg = supergroup([], ['x'])
  expect(sg.roots).toEqual([])
  expect(sg.nodes).toEqual([])
})
```

Add to `test/dag-constructors.test.ts`:

```ts
test('fromParentIds of an empty item array', () => {
  const sg = fromParentIds([])
  expect(sg.roots).toEqual([])
  expect(sg.nodes).toEqual([])
})
```

Create `test/types.test.ts`:

```ts
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
```

Add to `test/adapters.test.ts` (imports for `subgraph` from
`'../src/dag/subgraph'` if not present):

```ts
test('end-to-end: toDagBrowserNodes(subgraph(fromParentIds(...)))', () => {
  const items = [
    { id: 'Study', parentIds: [] },
    { id: 'Participant', parentIds: ['Study'] },
    { id: 'Visit', parentIds: ['Study', 'Participant'] },
    { id: 'Specimen', parentIds: ['Visit', 'Participant'] },
    { id: 'Doc', parentIds: ['Doc', 'Study'] },       // self-loop → backedge
  ]
  const sub = subgraph(fromParentIds(items), ['Study', 'Participant', 'Specimen', 'Doc'])
  const nodes = toDagBrowserNodes(sub)
  expect(nodes.map(n => n.id).sort()).toEqual(['Doc', 'Participant', 'Specimen', 'Study'])
  expect(nodes.find(n => n.id === 'Specimen')!.parentIds).toEqual(['Participant'])
  expect(nodes.find(n => n.id === 'Doc')!.parentIds.sort()).toEqual(['Doc', 'Study'])
})
```

- [ ] **Step 2: Run to verify state**

Run: `npx vitest run test/types.test.ts test/collection.test.ts test/dag-constructors.test.ts test/adapters.test.ts`
Expected: `test/types.test.ts` FAILS to compile (`SGNodeLike` not exported
from `'../src/index'`); the runtime tests may already pass — that's fine,
they're regression armor.

- [ ] **Step 3: Implement the re-export and doc comments**

`src/index.ts` — change the dims export line to include `SGNodeLike`:

```ts
export type { DimAccessor, DimSpec, DimInput, NormalDim, SGNodeLike } from './dims'
```

`src/selection.ts` — comment above `recordsFor`:

```ts
/**
 * Records are deduped by reference identity (Set<R>): the same logical
 * record loaded as two distinct objects counts twice. Keep one object per
 * record if you rely on union semantics.
 */
export function recordsFor<R>(nodes: SGNode<R>[]): R[] {
```

`src/node.ts` — comment above `pct()`:

```ts
  /**
   * Fraction of the collection's total records under this node. On dag
   * collections totalRecords is 0 until attachRecords runs (pct() = NaN),
   * and unmatched records still count in the denominator.
   */
  pct(): number { return this.records.length / this.ctx.totalRecords }
```

`src/dag/constructors.ts` — comment above `fromParentChild`'s `label` option
handling (place above the `labelOf` line):

```ts
  // label conflicts are last-write-wins: when multiple rows name the same
  // child with different labels, the last row's label sticks
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run` → ALL green. `npm run typecheck` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/selection.ts src/node.ts src/dag/constructors.ts test/types.test.ts test/collection.test.ts test/dag-constructors.test.ts test/adapters.test.ts
git commit -m "v2: clear deferred minors — SGNodeLike re-export, doc comments, gap tests"
```

---

## Task 5: packaging — .js import extensions, build config, package.json 2.0.0, LICENSE

`tsc` never rewrites import specifiers, so the current extensionless
relative imports would emit dist ESM that neither Node nor browsers can
resolve. Switch `src/` relative imports to explicit `.js` (NodeNext style),
add `tsconfig.build.json`, rewrite `package.json`, add LICENSE.

**Files:**
- Modify: every `src/*.ts` and `src/*/*.ts` relative import; `src/index.ts`
  (VERSION); `package.json`
- Create: `tsconfig.build.json`, `LICENSE`
- Test: existing suite + `npm run build` output inspection

**Interfaces:**
- Produces: `dist/` with `index.js`, `index.d.ts`, `dag/index.js`,
  `sequence/index.js`, `compare/index.js`, `adapters/index.js` (+ `.d.ts`),
  matching the `exports` map. `npm run build` and `npm run build:site`
  (Task 6 uses the latter). Test files keep extensionless imports (the root
  tsconfig stays `moduleResolution: bundler`).

- [ ] **Step 1: Add `.js` to all relative imports in src/**

```bash
perl -pi -e "s/(from '\.[^']*?)(?<!\.js)(')/\$1.js\$2/g" src/*.ts src/*/*.ts
```

Spot-check: `grep -rn "from '\." src/ | grep -v "\.js'"` → no output.
(All src relative imports point at files, never directories, so a uniform
`.js` append is correct.)

- [ ] **Step 2: Set VERSION to 2.0.0**

In `src/index.ts`: `export const VERSION = '2.0.0'`

- [ ] **Step 3: Create `tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noEmit": false,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Rewrite `package.json`**

Full new content (drops lodash and the dead vows/jasmine/xhr2 devDeps and
their scripts; `test` becomes vitest):

```json
{
  "name": "supergroup",
  "version": "2.0.0",
  "description": "Grouping for flat records that returns navigable structure: trees, DAGs, sequences, and comparisons whose nodes carry records, parents, paths, and aggregates.",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./dag": { "types": "./dist/dag/index.d.ts", "import": "./dist/dag/index.js" },
    "./sequence": { "types": "./dist/sequence/index.d.ts", "import": "./dist/sequence/index.js" },
    "./compare": { "types": "./dist/compare/index.d.ts", "import": "./dist/compare/index.js" },
    "./adapters": { "types": "./dist/adapters/index.d.ts", "import": "./dist/adapters/index.js" }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "build:site": "npm run build && rm -rf docs/vendor/supergroup && mkdir -p docs/vendor && cp -R dist docs/vendor/supergroup",
    "site:serve": "python3 -m http.server 8123 -d docs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run typecheck && npm run test && npm run build"
  },
  "repository": { "type": "git", "url": "https://github.com/Sigfried/supergroup.git" },
  "keywords": ["groupby", "hierarchy", "tree", "dag", "polyhierarchy", "d3", "sequence", "compare", "records"],
  "author": "Sigfried Gold",
  "license": "MIT",
  "bugs": { "url": "https://github.com/Sigfried/supergroup/issues" },
  "homepage": "https://sigfried.github.io/supergroup/",
  "engines": { "node": ">=18" },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^3.0.0"
  }
}
```

Then: `npm install` (prunes removed deps, refreshes the lockfile).

- [ ] **Step 5: Create `LICENSE`**

MIT text, `Copyright (c) 2014-2026 Sigfried Gold` (standard MIT license
body — the eleven-line boilerplate: permission grant paragraph, the
all-copies condition paragraph, and the AS-IS warranty disclaimer
paragraph).

- [ ] **Step 6: Verify build + suite + dist shape**

```bash
npm run typecheck && npx vitest run && npm run build
/bin/ls dist dist/dag dist/adapters
node -e "import('./dist/index.js').then(m => console.log(m.VERSION))"
```

Expected: 0 type errors; ALL tests green; dist contains `index.js`,
`index.d.ts`, plus `dag/`, `sequence/`, `compare/`, `adapters/` subdirs with
`index.js`/`index.d.ts`; the node one-liner prints `2.0.0`.

- [ ] **Step 7: Add dist/ to .gitignore check**

`dist/` must NOT be committed at repo root (the site vendors its own copy).
If there is no `.gitignore` or it lacks `dist`, add a line `dist/` (keep
existing entries).

- [ ] **Step 8: Commit**

```bash
git add -A src package.json package-lock.json tsconfig.build.json LICENSE .gitignore
git commit -m "v2: packaging — NodeNext dist build, exports map, 2.0.0 metadata, LICENSE"
```

---

## Task 6: npm pack smoke test

Prove the tarball installs and every subpath imports, before any site work
builds on the dist.

**Files:** none in-repo (scratchpad only)

- [ ] **Step 1: Pack and install into a scratch project**

```bash
cd "$SCRATCHPAD" && /bin/rm -rf sgpack && mkdir sgpack && cd sgpack
npm pack /Users/sgold15/github-repos/personal/supergroup
npm init -y >/dev/null && npm i ./supergroup-2.0.0.tgz
```

(`$SCRATCHPAD` = the session scratchpad directory.)

- [ ] **Step 2: Import every subpath and run a smoke snippet**

Write `smoke.mjs` in the scratch dir:

```js
import { supergroup, VERSION } from 'supergroup'
import { fromParentIds, subgraph } from 'supergroup/dag'
import { groupBySequence } from 'supergroup/sequence'
import { compare } from 'supergroup/compare'
import { toD3, toDagBrowserNodes } from 'supergroup/adapters'

const sg = supergroup([{ a: 'x' }, { a: 'y' }], 'a')
const dag = fromParentIds([{ id: 'p' }, { id: 'c', parentIds: ['p'] }])
const cmp = compare(sg, supergroup([{ a: 'y' }], 'a'))
console.log(VERSION, String(sg.roots[0]), toD3(sg).children.length,
  toDagBrowserNodes(subgraph(dag, ['p', 'c'])).length,
  cmp.roots.map(n => n.cmp.in).join(','),
  typeof groupBySequence)
```

Run: `node smoke.mjs`
Expected: `2.0.0 x 2 2 a,both function`

- [ ] **Step 3: No commit** (nothing in-repo changed). If any import fails,
fix the `exports` map / build in Task 5's files and re-run before moving on.

---

## Task 7: site datasets (`docs/data/`)

**Files:**
- Create: `docs/data/` — `fake-patient_data.csv`, `diffExample.csv`,
  `hurricane.csv`, `fips.csv`, `containment.json`
- Move: `examples/OlympicAthletes.csv` → `docs/data/OlympicAthletes.csv`

**Interfaces:**
- Produces: the six datasets `livecells.js` (Task 8) loads by these exact
  filenames.

- [ ] **Step 1: Copy the repo/branch/sibling datasets**

```bash
mkdir -p docs/data
git mv examples/OlympicAthletes.csv docs/data/
rmdir examples
git show origin/gh-pages:examples/fake-patient_data.csv > docs/data/fake-patient_data.csv
git show origin/gh-pages:examples/diffExample.csv > docs/data/diffExample.csv
/bin/cp /Users/sgold15/github-repos/personal/lifeflow/sampleData/hurricane.csv docs/data/
```

- [ ] **Step 2: FIPS data — mine the Toptal article**

WebFetch
`https://www.toptal.com/developers/javascript/ultimate-in-memory-data-collection-manipulation-with-supergroup-js`
and note (a) the FIPS dataset it uses and where it loads it from, (b) which
examples look worth adapting (feeds Task 9's review). If the article's
dataset is downloadable, save it as `docs/data/fips.csv`. If not, use the
Census fallback:

```bash
curl -s "https://www2.census.gov/geo/docs/reference/codes/files/national_county.txt" \
  | awk -F, 'BEGIN{print "state,state_fips,county_fips,county"} {print $1","$2","$3","$4}' > docs/data/fips.csv
head -3 docs/data/fips.csv   # expect: header, then AL,01,001,Autauga County
```

- [ ] **Step 3: Write `docs/data/containment.json`** (dmvd-shaped: one
self-loop, several multi-parent nodes)

```json
[
  { "id": "ResearchStudy", "parentIds": ["ResearchStudy"] },
  { "id": "Participant", "parentIds": ["ResearchStudy"] },
  { "id": "Consent", "parentIds": ["Participant"] },
  { "id": "Visit", "parentIds": ["Participant"] },
  { "id": "Specimen", "parentIds": ["Visit", "Participant"] },
  { "id": "Aliquot", "parentIds": ["Specimen"] },
  { "id": "Assay", "parentIds": ["Aliquot", "Visit"] },
  { "id": "Measurement", "parentIds": ["Assay", "Visit"] },
  { "id": "Document", "parentIds": ["ResearchStudy", "Visit"] },
  { "id": "Questionnaire", "parentIds": ["Document"] },
  { "id": "Response", "parentIds": ["Questionnaire", "Participant"] }
]
```

- [ ] **Step 4: Commit**

```bash
git add -A docs/data
git commit -m "docs site: demo datasets (athletes, patients, budgets, hurricanes, fips, containment)"
```

(The `examples/` → `docs/data/` move was already staged by `git mv`.)

---

## Task 7b: synthea/vocab clinical datasets (amendment, 2026-07-14)

Added after SG review: real clinical data for the sequence/DAG/compare
demos. Synthea 1k-patient OMOP extract (public S3) joined to SG's local
OMOP vocabulary (postgres db `n3c`, schema `n3c`). SG OK'd publishing
SNOMED/ATC/RxNorm concept names in the extracts.

**Files:**
- Create: `docs/data/curation/curate.sh`, `docs/data/curation/README.md`
- Create (generated by the script): `docs/data/synthea-conditions.csv`,
  `docs/data/synthea-drugs.csv`, `docs/data/synthea-persons.csv`,
  `docs/data/drug-classes.json`
- Modify: `docs/livecells.js` (four new dataset loads)

**Interfaces:**
- Produces datasets in cell scope: `conditions` (person_id, start_date,
  concept_id, condition), `drugs` (person_id, start_date, concept_id,
  drug), `persons` (person_id, gender M/F/other, year_of_birth, race),
  `drugClasses` (array of `{id, name, vocab, class, parentIds}` with
  string ids — `fromParentIds`-ready).
- Requirements to run the script: `curl`, `duckdb`, `psql` reaching db
  `n3c` with schema `n3c` (concept, concept_ancestor).

- [ ] **Step 1: Write `docs/data/curation/curate.sh`**

```sh
#!/bin/sh
# Rebuild the synthea/vocab demo extracts in docs/data/.
# Requires: curl, duckdb, psql with an OMOP vocabulary at db n3c, schema n3c.
# Data: synthea1k from the AWS open-data bucket (public, no credentials).
set -e
cd "$(dirname "$0")"
work=$(mktemp -d)
base=https://synthea-omop.s3.amazonaws.com/synthea1k
for t in person condition_era drug_era; do
  curl -s "$base/$t.csv" -o "$work/$t.csv"
done

duckdb -c "
COPY (SELECT DISTINCT condition_concept_id FROM '$work/condition_era.csv') TO '$work/cond_ids.csv' (HEADER false);
COPY (SELECT DISTINCT drug_concept_id FROM '$work/drug_era.csv') TO '$work/drug_ids.csv' (HEADER false);
"

psql -X -d n3c -At <<SQL
\\set ON_ERROR_STOP on
create temp table demo_drug_ids (concept_id bigint);
\\copy demo_drug_ids from '$work/drug_ids.csv' with (format csv)
create temp table demo_cond_ids (concept_id bigint);
\\copy demo_cond_ids from '$work/cond_ids.csv' with (format csv)

create temp table drug_closure as
  select distinct ca.ancestor_concept_id as concept_id
  from n3c.concept_ancestor ca
  join demo_drug_ids d on ca.descendant_concept_id = d.concept_id
  join n3c.concept c on c.concept_id = ca.ancestor_concept_id
    and c.vocabulary_id in ('ATC','RxNorm')
  union
  select concept_id from demo_drug_ids;

create temp table drug_edges as
  select ca.ancestor_concept_id as parent_id, ca.descendant_concept_id as child_id
  from n3c.concept_ancestor ca
  where ca.min_levels_of_separation = 1
    and ca.ancestor_concept_id in (select concept_id from drug_closure)
    and ca.descendant_concept_id in (select concept_id from drug_closure);

\\copy (select c.concept_id, c.concept_name, c.vocabulary_id, c.concept_class_id from n3c.concept c join drug_closure cl on c.concept_id = cl.concept_id) to '$work/drug_nodes.csv' with (format csv, header)
\\copy (select parent_id, child_id from drug_edges) to '$work/drug_edges.csv' with (format csv, header)
\\copy (select c.concept_id, c.concept_name from n3c.concept c join demo_cond_ids d on c.concept_id = d.concept_id) to '$work/cond_names.csv' with (format csv, header)
\\copy (select c.concept_id, c.concept_name from n3c.concept c join demo_drug_ids d on c.concept_id = d.concept_id) to '$work/drug_names.csv' with (format csv, header)
SQL

duckdb -c "
COPY (
  SELECT e.person_id, e.condition_era_start_date AS start_date,
         e.condition_concept_id AS concept_id, n.concept_name AS condition
  FROM '$work/condition_era.csv' e
  JOIN '$work/cond_names.csv' n ON e.condition_concept_id = n.concept_id
  ORDER BY e.person_id, start_date
) TO '../synthea-conditions.csv' (HEADER);
COPY (
  SELECT e.person_id, e.drug_era_start_date AS start_date,
         e.drug_concept_id AS concept_id, n.concept_name AS drug
  FROM '$work/drug_era.csv' e
  JOIN '$work/drug_names.csv' n ON e.drug_concept_id = n.concept_id
  ORDER BY e.person_id, start_date
) TO '../synthea-drugs.csv' (HEADER);
COPY (
  SELECT person_id,
         CASE gender_concept_id WHEN 8507 THEN 'M' WHEN 8532 THEN 'F' ELSE 'other' END AS gender,
         year_of_birth, race_source_value AS race
  FROM '$work/person.csv'
) TO '../synthea-persons.csv' (HEADER);
COPY (
  SELECT CAST(n.concept_id AS VARCHAR) AS id,
         n.concept_name AS name,
         n.vocabulary_id AS vocab,
         n.concept_class_id AS \"class\",
         coalesce(list(CAST(e.parent_id AS VARCHAR)) FILTER (e.parent_id IS NOT NULL), []) AS \"parentIds\"
  FROM '$work/drug_nodes.csv' n
  LEFT JOIN '$work/drug_edges.csv' e ON n.concept_id = e.child_id
  GROUP BY 1, 2, 3, 4
  ORDER BY 1
) TO '../drug-classes.json' (FORMAT json, ARRAY true);
"
rm -rf "$work"
echo "done; extracts written to docs/data/"
```

(Adjust duckdb JSON/FILTER syntax if the installed duckdb version differs —
the required output is a JSON array of `{id, name, vocab, class, parentIds}`
objects with string ids and `parentIds` always an array.)

- [ ] **Step 2: Write `docs/data/curation/README.md`** — what the script
builds, the four outputs, the requirements line, and a note that scaling up
(synthea100k, more tables) is intended for the future lifeflow/timelines
demo.

- [ ] **Step 3: Run the script and sanity-check the outputs**

```bash
sh docs/data/curation/curate.sh
```

Checks (report actual numbers):
- `synthea-conditions.csv` ≈ 7,897 data rows; `synthea-drugs.csv` ≈ 6,652;
  `synthea-persons.csv` ≈ 1,130. Every row has a non-empty name column.
- `drug-classes.json`: ≈ 1,284 objects; every `parentIds` entry references
  an `id` present in the file (validate with a small node/duckdb check);
  ≈ 80 nodes with 2+ parents.
- **Root sanity (known wrinkle):** count nodes with empty `parentIds`.
  Expect the 14 ATC 1st-level classes plus RxNorm ingredients that have no
  ATC ancestry (unclassified drugs/vaccines) — report the composition (how
  many ATC vs RxNorm roots). If ATC roots ≠ 14 (e.g. mid-hierarchy ATC
  classes appear as roots because min_sep=1 edges skip levels), fix the
  edge query (fall back to `concept_relationship` `Is a`/`ATC - RxNorm`
  edges within the closure) and re-run.
- Total added bytes ≤ ~1.5MB.

- [ ] **Step 4: Wire the datasets into `docs/livecells.js`**

Add to the `data` object (after the `containment` line):

```js
  conditions: await csv('synthea-conditions.csv'),
  drugs: await csv('synthea-drugs.csv'),
  persons: await csv('synthea-persons.csv'),
  drugClasses: await json('drug-classes.json'),
```

- [ ] **Step 5: Verify the page still loads** — `npm run site:serve`,
headless-Chrome dump of `http://localhost:8123/?runall` (same method as
Task 8): smoke cell renders, no `cell-error`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add docs/data docs/livecells.js
git commit -m "docs site: synthea/OMOP clinical datasets + curation script"
```

### Task 9 amendments (use with the original Task 9)

Step 3 (DAG section) gains the clinical centerpiece after the containment
intro cells — replace the plan's `attachRecords` demo cell with:

```js
// real drug classification: ATC + RxNorm over the drugs this cohort used
const g = fromParentIds(drugClasses, { records: drugs, recordKey: r => String(r.concept_id) })
return { nodes: g.nodes.length, roots: g.roots.length,
  multiParent: g.nodes.filter(n => n.parents.length > 1).length,
  sampleMultiParent: g.nodes.find(n => n.parents.length > 1)?.label }
```

```js
// union-then-sum (vs-hub's drc): distinct patients under each ATC class
const g = fromParentIds(drugClasses, { records: drugs, recordKey: r => String(r.concept_id) })
const patientsUnder = n => new Set(recordsUnder([n]).map(r => r.person_id)).size
return g.roots.filter(n => n.children.length)
  .map(n => `${n.label}: ${patientsUnder(n)} patients`).join('\n')
```

The DBW embed cell feeds `toDagBrowserNodes(fromParentIds(drugClasses))`
instead of (or in addition to) `containment`.

Add a bar-chart cell (top classes by patient count — d3 bars from the
rollup above; ~25 lines, same pattern as the icicle cell).

Step 4 (sequence) keeps the hurricane cells as the intro, then adds the
clinical sequence cells (linking cell publishing `firstConditions` via
`Object.assign(window, ...)`, a forward `groupBySequence(firstConditions,
{key: 'condition', next: e => e.next, direction: 'forward', maxDepth: 3})`
cell, and an anchored-both cell anchoring each patient's first diagnosis of
the programmatically-most-common condition). Same next/prev linking pattern
as the hurricane cell, keyed by `person_id`, sorted by `start_date`.

Step 5 (compare) keeps budgets as the intro, then adds the cohort compare:

```js
// cohort comparison over one classification: women vs men, by node id
const gender = new Map(persons.map(p => [p.person_id, p.gender]))
const cohort = g => fromParentIds(drugClasses,
  { records: drugs.filter(r => gender.get(r.person_id) === g), recordKey: r => String(r.concept_id) })
const diff = compare(cohort('F'), cohort('M'), { by: 'id' })
const interesting = diff.nodes.filter(n => n.cmp && Math.abs(n.cmp.countDelta) > 25)
return interesting.map(n => `${n.label}: ${n.cmp.in} Δ${n.cmp.countDelta}`).join('\n')
```

(Implementer: tune thresholds/maxDepth to what the real data shows; every
cell must render non-trivially in the headless check.)

### Task 9 mechanics round (amendment, 2026-07-14): Tasks 9a + 9b

SG rejected the first draft's cell mechanics (ee419e2). Spec authority:
"Live cells" + "Library additions" sections of the design doc (as amended
2026-07-14). Run Task 9a, then 9b, before any further Task 9 content work.
Binding rules from the spec:

- The site renderer type-sniffs nothing from the library: DOM node →
  append; string → `<pre>`; anything else → circular-safe JSON. Anything
  shaped that the site displays comes from an explicit formatting function
  the reader could call in their own console.
- Formatting functions return **strings**; no DOM in the library.
- **Truncation only on request**: no default `maxDepth`/`maxChildren`/
  `maxRows`; applied truncation is always explicit in the output, never
  silent.
- No cell runs on page load; `?runall` and the Run-all button remain.
- Cells: no `return`, no top-level `const`; the last statement's value is
  the output; bare assignments publish to `window`; Clear removes exactly
  the names that cell published.
- `prettyPrint` emits no summary header — `summary()` is separate.

## Task 9a: `supergroup/formatting` module + `SGNode.dimPath`

**Files:**
- Create: `src/formatting/index.ts`, `test/formatting.test.ts`
- Modify: `src/node.ts` (add `dimPath` after `namePath`), `package.json`
  (exports map), `test/exports.test.ts`, `test/node-nav.test.ts` (dimPath
  tests live with the other nav tests)

**Interfaces:**
- Consumes: `SGNode` (`label`, `records`, `children`, `cmp`, `pedigree()`,
  `descendants()`, `synthetic`, `direction`, `dim`), `Supergroup`
  (`roots`, `nodes`, `root`), `recordsUnder(nodes)` from
  `src/selection.ts`.
- Produces (Task 9b and site cells rely on these exact signatures):
  - `prettyPrint(x, opts?)` — `x: Supergroup<R> | SGNode<R> | SGNode<R>[]`,
    `opts: { maxDepth?: number; maxChildren?: number; fmt?: (n) => string;
    rails?: boolean }` → `string`
  - `summary(x)` — same `x` → `string` like
    `110 roots · 2,816 nodes · 8,618 records`
  - `toTable(records, opts?)` — `records: readonly object[]`,
    `opts: { maxRows?: number; columns?: string[] }` → `string`
  - `SGNode.dimPath(sep = '/')` → `string`

- [ ] **Step 1: failing tests** — `test/formatting.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { supergroup } from '../src/index'
import { prettyPrint, summary, toTable } from '../src/formatting/index'

const recs = [
  { c: 'US', s: 'Swim', n: 2 },
  { c: 'US', s: 'Swim', n: 1 },
  { c: 'US', s: 'Dive', n: 3 },
  { c: 'RU', s: 'Gym', n: 5 },
]
const sg = () => supergroup(recs, ['c', 's'])

describe('prettyPrint', () => {
  it('prints every node by default (no truncation, no header)', () => {
    const out = prettyPrint(sg())
    expect(out).toBe([
      'US (3 recs)',
      '  Swim (2 recs)',
      '  Dive (1 recs)',
      'RU (1 recs)',
      '  Gym (1 recs)',
    ].join('\n'))
  })
  it('maxDepth cuts with an explicit marker', () => {
    const out = prettyPrint(sg(), { maxDepth: 1 })
    expect(out).toBe([
      'US (3 recs)',
      '  … 2 children',
      'RU (1 recs)',
      '  … 1 child',
    ].join('\n'))
  })
  it('maxChildren cuts with an explicit count', () => {
    const out = prettyPrint(sg(), { maxChildren: 1 })
    expect(out.split('\n')).toContain('  … 1 more')
  })
  it('fmt overrides the node line', () => {
    const out = prettyPrint(sg(), { fmt: n => String(n.label).toLowerCase() })
    expect(out.split('\n')[0]).toBe('us')
  })
  it('rails style', () => {
    const out = prettyPrint(sg(), { rails: true })
    expect(out.split('\n')[1]).toBe('├─ Swim (2 recs)')
    expect(out.split('\n')[2]).toBe('└─ Dive (1 recs)')
  })
  it('accepts a single node and a node array', () => {
    const c = sg()
    expect(prettyPrint(c.roots[0]!)).toMatch(/^US/)
    expect(prettyPrint(c.roots)).toMatch(/\nRU/)
  })
})

describe('summary', () => {
  it('collection shape line', () => {
    expect(summary(sg())).toBe('2 roots · 5 nodes · 4 records')
  })
  it('node shape line', () => {
    expect(summary(sg().roots[0]!)).toBe('1 root · 3 nodes · 3 records')
  })
})

describe('toTable', () => {
  it('aligned text table, complete by default', () => {
    const out = toTable(recs)
    const lines = out.split('\n')
    expect(lines[0]).toBe('c   s     n')
    expect(lines[1]).toBe('──  ────  ─')
    expect(lines).toHaveLength(2 + recs.length) // header + rule + rows
    expect(lines[2]).toBe('US  Swim  2')
  })
  it('maxRows truncates explicitly', () => {
    const out = toTable(recs, { maxRows: 2 })
    expect(out).toContain('… 2 more rows (4 total)')
  })
  it('columns selects and orders', () => {
    expect(toTable(recs, { columns: ['n', 'c'] }).split('\n')[0]).toBe('n  c')
  })
})
```

Add to `test/node-nav.test.ts` (same describe style as namePath tests):

```ts
it('dimPath joins pedigree dims', () => {
  const c = supergroup(recs, ['c', 's'])
  expect(c.node(['US', 'Swim'])!.dimPath()).toBe('c/s')
  expect(c.node(['US', 'Swim'])!.dimPath(' > ')).toBe('c > s')
})
```

(Reuse that file's existing fixture records; adjust expected dims to the
fixture's dim names — the assertion shape is what's binding.)

Add `'prettyPrint'`/`'summary'`/`'toTable'` to a new `formatting` case in
`test/exports.test.ts`, importing `* as formatting from
'../src/formatting/index'`.

- [ ] **Step 2: run to verify failure** —
`npx vitest run test/formatting.test.ts` → FAIL (module not found).

- [ ] **Step 3: implement `src/formatting/index.ts`**

```ts
import type { SGNode } from '../node.js'
import { Supergroup } from '../collection.js'
import { recordsUnder } from '../selection.js'

export interface PrettyPrintOpts<R> {
  /** levels shown; omitted = all */
  maxDepth?: number
  /** children listed per node; omitted = all */
  maxChildren?: number
  /** per-node line; default: label + record count + cmp when present */
  fmt?: (n: SGNode<R>) => string
  /** box-drawing rails instead of plain two-space indentation */
  rails?: boolean
}

const num = (n: number) => n.toLocaleString('en-US')

const defaultFmt = <R>(n: SGNode<R>): string => {
  let s = `${n.label} (${num(n.records.length)} recs)`
  if (n.cmp) s += ` [${n.cmp.in}${n.cmp.countDelta ? ` Δ${num(n.cmp.countDelta)}` : ''}]`
  return s
}

type Printable<R> = Supergroup<R> | SGNode<R> | SGNode<R>[]

const rootsOf = <R>(x: Printable<R>): SGNode<R>[] =>
  x instanceof Supergroup ? (x.root ? [x.root] : x.roots)
  : Array.isArray(x) ? x : [x]

export function prettyPrint<R>(x: Printable<R>, opts: PrettyPrintOpts<R> = {}): string {
  const { maxDepth, maxChildren, fmt = defaultFmt, rails = false } = opts
  const lines: string[] = []
  const walk = (n: SGNode<R>, depth: number, prefix: string, childIndent: string, onPath: Set<SGNode<R>>) => {
    if (onPath.has(n)) { lines.push(`${prefix}↻ ${n.label} (cycle)`); return }
    lines.push(prefix + fmt(n))
    if (maxDepth !== undefined && depth + 1 >= maxDepth) {
      const k = n.children.length
      if (k) lines.push(`${childIndent}${rails ? '└─ ' : ''}… ${num(k)} ${k === 1 ? 'child' : 'children'}`)
      return
    }
    const shown = maxChildren !== undefined ? n.children.slice(0, maxChildren) : n.children
    const hidden = n.children.length - shown.length
    onPath.add(n)
    shown.forEach((c, i) => {
      const last = i === shown.length - 1 && hidden === 0
      const cPrefix = rails ? childIndent + (last ? '└─ ' : '├─ ') : childIndent
      const cIndent = rails ? childIndent + (last ? '   ' : '│  ') : childIndent + '  '
      walk(c, depth + 1, cPrefix, cIndent, onPath)
    })
    onPath.delete(n)
    if (hidden > 0) lines.push(`${childIndent}${rails ? '└─ ' : ''}… ${num(hidden)} more`)
  }
  for (const r of rootsOf(x)) walk(r, 0, '', rails ? '' : '  ', new Set())
  return lines.join('\n')
}

export function summary<R>(x: Printable<R>): string {
  const roots = rootsOf(x)
  let nodeCount: number
  if (x instanceof Supergroup) nodeCount = x.nodes.length
  else {
    const seen = new Set<SGNode<R>>(roots)
    for (const r of roots) for (const d of r.descendants()) seen.add(d)
    nodeCount = seen.size
  }
  const records = recordsUnder(roots).length
  return `${num(roots.length)} root${roots.length === 1 ? '' : 's'} · ${num(nodeCount)} nodes · ${num(records)} records`
}

export interface ToTableOpts {
  /** rows shown; omitted = all */
  maxRows?: number
  /** column selection + order; default: keys of the first record */
  columns?: string[]
}

export function toTable(records: readonly object[], opts: ToTableOpts = {}): string {
  if (!records.length) return '(no records)'
  const cols = opts.columns ?? Object.keys(records[0]!)
  const rows = opts.maxRows !== undefined ? records.slice(0, opts.maxRows) : records
  const cell = (v: unknown): string =>
    v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
  const grid = rows.map(r => cols.map(c => cell((r as Record<string, unknown>)[c])))
  const widths = cols.map((c, i) => Math.max(c.length, ...grid.map(g => g[i]!.length)))
  const line = (cells: string[]) => cells.map((s, i) => s.padEnd(widths[i]!)).join('  ').trimEnd()
  const out = [line(cols), line(widths.map(w => '─'.repeat(w))), ...grid.map(line)]
  if (rows.length < records.length)
    out.push(`… ${num(records.length - rows.length)} more rows (${num(records.length)} total)`)
  return out.join('\n')
}
```

`src/node.ts`, directly after `namePath`:

```ts
dimPath(sep = '/'): string {
  const dims = this.pedigree().filter(n => !n.synthetic).map(n => String(n.dim))
  if (this.direction === 'backward') dims.reverse()
  return dims.join(sep)
}
```

`package.json` exports map gains (before `"./adapters"`):

```json
"./formatting": { "types": "./dist/formatting/index.d.ts", "import": "./dist/formatting/index.js" },
```

- [ ] **Step 4: run tests** — `npx vitest run test/formatting.test.ts
test/node-nav.test.ts test/exports.test.ts` → PASS; then full gate
`npm run typecheck && npm test` → 0 errors, all green.

- [ ] **Step 5: rebuild the vendored dist** — `npm run build:site`;
verify `/bin/ls docs/vendor/supergroup/formatting` shows `index.js` +
`index.d.ts`.

- [ ] **Step 6: Commit**

```bash
git add src test package.json docs/vendor
git commit -m "feat: supergroup/formatting (prettyPrint, summary, toTable) + SGNode.dimPath"
```

## Task 9b: cell runtime mechanics rework + cell conversion

**Files:**
- Modify: `docs/livecells.js` (rewrite), `docs/index.html` (import map
  entry, Run-all button, every cell, dataset markers), `docs/site.css`

**Interfaces:**
- Consumes: `supergroup/formatting` from the vendored dist (Task 9a).
- Produces: the revised cell conventions all later Task 9 content work
  authors against (listed in the binding rules above).

- [ ] **Step 1: rewrite `docs/livecells.js`** — full replacement:

```js
import * as core from 'supergroup'
import * as dagMod from 'supergroup/dag'
import * as seqMod from 'supergroup/sequence'
import * as cmpMod from 'supergroup/compare'
import * as adapters from 'supergroup/adapters'
import * as fmtMod from 'supergroup/formatting'
import * as d3 from 'd3'
import { basicSetup, EditorView } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'

const csv = async (name) => d3.csvParse(await (await fetch(`data/${name}`)).text(), d3.autoType)
const json = async (name) => (await fetch(`data/${name}`)).json()

const files = {
  athletes: 'OlympicAthletes.csv', patients: 'fake-patient_data.csv',
  budgets: 'diffExample.csv', hurricanes: 'hurricane.csv', fips: 'fips.csv',
  containment: 'containment.json', conditions: 'synthea-conditions.csv',
  drugs: 'synthea-drugs.csv', persons: 'synthea-persons.csv',
  drugClasses: 'drug-classes.json',
}
const data = Object.fromEntries(await Promise.all(Object.entries(files).map(
  async ([k, f]) => [k, await (f.endsWith('.json') ? json(f) : csv(f))])))

const scope = { ...core, ...dagMod, ...seqMod, ...cmpMod, ...adapters, ...fmtMod, d3, ...data }
Object.assign(window, scope) // cells and the devtools console share one namespace

// --- result rendering: DOM passes through, strings are pre-formatted, ---
// --- everything else is JSON. No library-aware display logic here.    ---
function safeJson(v) {
  const seen = new WeakSet()
  const out = JSON.stringify(v, (k, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]'
      seen.add(val)
    }
    return val
  }, 2)
  return out === undefined ? String(v) : out
}

function render(result, out) {
  out.replaceChildren()
  if (result instanceof Node) { out.append(result); return }
  const pre = document.createElement('pre')
  pre.textContent = typeof result === 'string' ? result : safeJson(result)
  out.append(pre)
}

const placeholder = () => {
  const span = document.createElement('span')
  span.className = 'cell-placeholder'
  span.textContent = '▶ Run to evaluate'
  return span
}

// --- cells -----------------------------------------------------------------
// Sloppy-mode direct eval: the last statement's value is the output, and
// bare assignments (`sg = …`) create window globals cells publish for
// console use. `await` is unavailable inside eval'd code; a thenable
// result is awaited before rendering.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const evalCell = new AsyncFunction('__code', 'return eval(__code)')

const published = new Map() // name -> value at last publish, across all cells

const showPub = (cell) => {
  cell.pub.textContent = cell.published.size ? `→ window: ${[...cell.published].join(', ')}` : ''
}

async function runCell(cell) {
  const { view, out, status, btn } = cell
  btn.disabled = true
  status.textContent = ' …'
  const before = new Set(Object.keys(window))
  const prior = new Map([...published.keys()].map((k) => [k, window[k]]))
  const t0 = performance.now()
  try {
    const result = await evalCell(view.state.doc.toString())
    render(result, out)
    const names = Object.keys(window).filter((k) => !before.has(k))
    for (const [k, v] of prior) if (window[k] !== v) names.push(k)
    for (const k of names) {
      // republished name: ownership moves to this cell (last write wins),
      // so each name has exactly one owning cell and one Clear that removes it
      for (const other of cells) if (other !== cell && other.published.delete(k)) showPub(other)
      published.set(k, window[k])
      cell.published.add(k)
    }
    showPub(cell)
    status.textContent = ` ✓ ${Math.round(performance.now() - t0)}ms`
    return true
  } catch (e) {
    out.replaceChildren()
    const pre = document.createElement('pre')
    pre.className = 'cell-error'
    pre.textContent = String(e.stack ?? e)
    out.append(pre)
    status.textContent = ' ✗'
    return false
  } finally {
    btn.disabled = false
  }
}

function clearCell(cell) {
  for (const name of cell.published) { delete window[name]; published.delete(name) }
  cell.published.clear()
  showPub(cell)
  cell.status.textContent = ''
  cell.out.replaceChildren(placeholder())
}

const cells = []
for (const pre of document.querySelectorAll('pre.cell')) {
  const code = pre.textContent.trim()
  const wrap = document.createElement('div')
  wrap.className = 'cell-wrap'
  pre.replaceWith(wrap)
  const editorHost = document.createElement('div')
  editorHost.className = 'cell-editor'
  const bar = document.createElement('div')
  bar.className = 'cell-bar'
  const btn = document.createElement('button')
  btn.textContent = 'Run'
  const clearBtn = document.createElement('button')
  clearBtn.textContent = 'Clear'
  const status = document.createElement('span')
  const pub = document.createElement('span')
  pub.className = 'cell-published'
  bar.append(btn, clearBtn, status, pub)
  const out = document.createElement('div')
  out.className = 'cell-out'
  out.append(placeholder())
  wrap.append(editorHost, bar, out)
  const view = new EditorView({ doc: code, parent: editorHost, extensions: [basicSetup, javascript()] })
  const cell = { view, out, status, btn, pub, published: new Set() }
  cell.run = () => runCell(cell)
  btn.addEventListener('click', cell.run)
  clearBtn.addEventListener('click', () => clearCell(cell))
  editorHost.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); e.stopPropagation(); cell.run() }
  }, true)
  cells.push(cell)
}

// --- dataset preview cards (site furniture, not cell output) ---------------
function htmlTable(records, cols) {
  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const headRow = document.createElement('tr')
  for (const c of cols) { const th = document.createElement('th'); th.textContent = c; headRow.append(th) }
  thead.append(headRow)
  table.append(thead)
  const tbody = document.createElement('tbody')
  for (const r of records) {
    const tr = document.createElement('tr')
    for (const c of cols) {
      const td = document.createElement('td')
      const v = r[c]
      td.textContent = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '')
      tr.append(td)
    }
    tbody.append(tr)
  }
  table.append(tbody)
  return table
}

for (const el of document.querySelectorAll('div.dataset')) {
  const name = el.dataset.name
  const records = data[name]
  if (!records?.length) continue
  const cols = Object.keys(records[0])
  const head = document.createElement('div')
  head.className = 'dataset-head'
  const link = document.createElement('a')
  link.href = `data/${files[name]}`
  link.download = ''
  link.textContent = files[name]
  head.append(`${name} — ${records.length.toLocaleString('en-US')} rows × ${cols.length} cols · `, link)
  const det = document.createElement('details')
  const sum = document.createElement('summary')
  sum.textContent = 'preview'
  det.append(sum, htmlTable(records.slice(0, 8), cols))
  el.append(head, det)
  el.classList.add('dataset-card')
}

// --- run controls: nothing runs on load ------------------------------------
const runAll = async () => { for (const c of cells) await c.run() }
document.querySelector('#run-all')?.addEventListener('click', runAll)
if (new URLSearchParams(location.search).has('runall')) await runAll()
```

- [ ] **Step 2: `docs/index.html` mechanics edits**

  - Import map gains
    `"supergroup/formatting": "./vendor/supergroup/formatting/index.js"`.
  - Ensure a Run-all control near the top:
    `<button id="run-all">Run all cells</button>` (add if the draft lacks
    one; keep whatever placement exists otherwise).
  - Remove the `autorun` class from every cell.
  - Add one dataset marker `<div class="dataset" data-name="NAME"></div>`
    immediately after the paragraph that first introduces each dataset
    (`athletes`, `patients`, `budgets`, `hurricanes`, `containment`,
    `conditions`, `drugs`, `persons`, `drugClasses`; `fips` only if the
    draft mentions it).

- [ ] **Step 3: convert every cell to the new conventions.** Rules:

  1. Drop `return`; the last statement must be the expression to display.
  2. Top-level `const`/`let` → bare assignment (`sg = …`) so the cell
     publishes its names; keep `const`/`let` only for throwaway locals not
     worth inspecting.
  3. A cell whose display value is an object literal either assigns it
     (`out = { … }` — assignment is an expression, so it displays AND
     publishes) or wraps it in parens (`({ … })`); a bare `{` would parse
     as a block.
  4. Structure display is explicit: end with `prettyPrint(x, { … })`,
     `summary(x)`, or `toTable(records, { … })`. Choose options per cell
     so output stays readable (e.g. the athletes quick-start:
     `prettyPrint(sg, { maxDepth: 2, maxChildren: 8 })`); never lean on
     renderer magic — there is none.
  5. Cells showing raw records end with `toTable(recs, { maxRows: N })`.
  6. d3/DBW cells still end with the DOM node (`svg.node()`, container
     div) — unchanged.

  Worked example (quick-start cell):

  ```
  before:
    // group by country, sport, year — every level keeps its records
    const sg = supergroup(athletes, ['Country', 'Sport', 'Year'])
    return sg

  after:
    // group by country, sport, year — every level keeps its records
    sg = supergroup(athletes, ['Country', 'Sport', 'Year'])
    summary(sg)
  ```

  followed (same cell or the next) by
  `prettyPrint(sg, { maxDepth: 2, maxChildren: 8 })`.

- [ ] **Step 4: `docs/site.css`** — remove the now-dead `.cell-out
details` and `.sg-leaf` rules; add:

```css
.cell-placeholder { color: #999; font-style: italic; }
.cell-bar { display: flex; gap: .6rem; align-items: baseline; }
.cell-published { color: #667; font-size: 13px; font-family: ui-monospace, Menlo, Consolas, monospace; margin-left: auto; }
.dataset-card { margin: 1rem 0; padding: .5rem .8rem; background: var(--soft); border: 1px solid var(--line); border-radius: 6px; font-size: 15px; }
.dataset-card table { font-size: 13px; margin-top: .4rem; }
```

- [ ] **Step 5: headless verify** — `npm run site:serve`, then:

```bash
/bin/rm -f /tmp/sg-runall.html
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless=new --dump-dom --virtual-time-budget=30000 \
  'http://localhost:8123/?runall' > /tmp/sg-runall.html
grep -c 'cell-error' /tmp/sg-runall.html        # expect 0 (grep exits 1)
grep -c 'cell-placeholder' /tmp/sg-runall.html  # expect 0 (all cells ran)
grep -c 'window:' /tmp/sg-runall.html           # expect > 0
```

Also dump *without* `?runall` and confirm every `.cell-out` shows the
placeholder (nothing runs on load). Stop the server.

- [ ] **Step 6: interactive spot-check** — with the server up, in a real
browser: Run the quick-start cell, confirm `✓ Nms` status, `→ window: sg`
badge, and that typing `sg` in the devtools console returns the
collection; Clear removes output and `window.sg`; Shift-Enter runs;
dataset cards show counts and preview tables.

- [ ] **Step 7: Commit**

```bash
git add docs/index.html docs/livecells.js docs/site.css
git commit -m "docs site: cell mechanics rework — no autorun, eval cells, window publishing, no-magic renderer, dataset cards"
```

---

## Task 8: live-cell runtime + page skeleton

The cell runtime, page skeleton with import map, and styles — verified with
a smoke cell before any real content goes in.

**Files:**
- Create: `docs/index.html`, `docs/livecells.js`, `docs/site.css`
- Modify: none

**Interfaces:**
- Consumes: `docs/vendor/supergroup/` (produced by `npm run build:site`),
  `docs/data/*` (Task 7).
- Produces: the cell conventions Task 9 authors against:
  - a cell is `<pre class="cell">…code…</pre>` (add class `autorun` to run
    on page load); code is a **function body** that ends with `return <value>`
  - cell scope: every export of `supergroup`, `supergroup/dag`,
    `supergroup/sequence`, `supergroup/compare`, `supergroup/adapters`,
    plus `d3` and datasets `athletes`, `patients`, `budgets`, `hurricanes`,
    `fips`, `containment`
  - returned DOM nodes render as-is; SGNode / SGNode[] / Supergroup render
    as an expandable tree; anything else pretty-prints as JSON
  - everything in scope is also on `window`

- [ ] **Step 1: Run `npm run build:site`** — creates
`docs/vendor/supergroup/`. Verify: `/bin/ls docs/vendor/supergroup` shows
`index.js` and the four subdirs.

- [ ] **Step 2: Write `docs/index.html`** (skeleton + one smoke cell; real
content lands in Task 9)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>supergroup — grouping that returns navigable structure</title>
<link rel="stylesheet" href="site.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dag-browser-widget@0.2.0/dist/dag-browser-widget.css">
<script type="importmap">
{
  "imports": {
    "supergroup": "./vendor/supergroup/index.js",
    "supergroup/dag": "./vendor/supergroup/dag/index.js",
    "supergroup/sequence": "./vendor/supergroup/sequence/index.js",
    "supergroup/compare": "./vendor/supergroup/compare/index.js",
    "supergroup/adapters": "./vendor/supergroup/adapters/index.js",
    "d3": "https://esm.sh/d3@7",
    "codemirror": "https://esm.sh/codemirror@6.0.1",
    "@codemirror/lang-javascript": "https://esm.sh/@codemirror/lang-javascript@6",
    "react": "https://esm.sh/react@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "dag-browser-widget": "https://esm.sh/dag-browser-widget@0.2.0?deps=react@18.3.1,react-dom@18.3.1"
  }
}
</script>
</head>
<body>
<main>
<h1>supergroup</h1>
<p>Grouping for flat records that returns navigable structure. Live docs —
every code cell below is editable; press Run. Everything in cell scope is
also on <code>window</code> for devtools experimentation.</p>
<p><button id="run-all">Run all cells</button></p>

<pre class="cell autorun">
return supergroup(athletes, ['Country', 'Sport', 'Year'])
</pre>

</main>
<script type="module" src="livecells.js"></script>
</body>
</html>
```

Note for cell authoring: escape `<` as `&lt;` and `&` as `&amp;` inside
`<pre>` blocks (rare in these examples — arrow functions use `=>`).

- [ ] **Step 3: Write `docs/livecells.js`**

```js
import * as core from 'supergroup'
import * as dagMod from 'supergroup/dag'
import * as seqMod from 'supergroup/sequence'
import * as cmpMod from 'supergroup/compare'
import * as adapters from 'supergroup/adapters'
import * as d3 from 'd3'
import { basicSetup, EditorView } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'

const csv = async (name) => d3.csvParse(await (await fetch(`data/${name}`)).text(), d3.autoType)
const json = async (name) => (await fetch(`data/${name}`)).json()

const data = {
  athletes: await csv('OlympicAthletes.csv'),
  patients: await csv('fake-patient_data.csv'),
  budgets: await csv('diffExample.csv'),
  hurricanes: await csv('hurricane.csv'),
  fips: await csv('fips.csv'),
  containment: await json('containment.json'),
}

const scope = { ...core, ...dagMod, ...seqMod, ...cmpMod, ...adapters, d3, ...data }
Object.assign(window, scope)   // devtools escape hatch

// --- result rendering -----------------------------------------------------
const isSGNode = (v) => !!v && typeof v === 'object'
  && 'label' in v && 'records' in v && 'children' in v && 'parents' in v
const isCollection = (v) => !!v && typeof v === 'object' && 'roots' in v && 'nodes' in v

function nodeSummary(n) {
  let s = `${n.label} (${n.records.length} recs)`
  if (n.cmp) s += `  [${n.cmp.in}${n.cmp.countDelta ? ` Δ${n.cmp.countDelta}` : ''}]`
  return s
}

function renderNode(n, depth = 0) {
  if (!n.children.length || depth > 8) {
    const div = document.createElement('div')
    div.className = 'sg-leaf'
    div.textContent = nodeSummary(n)
    return div
  }
  const det = document.createElement('details')
  det.open = depth < 2
  const sum = document.createElement('summary')
  sum.textContent = nodeSummary(n)
  det.append(sum)
  for (const c of n.children) det.append(renderNode(c, depth + 1))
  return det
}

function render(result, out) {
  out.replaceChildren()
  if (result instanceof Node) { out.append(result); return }
  if (isCollection(result)) result = result.root ? [result.root] : result.roots
  if (isSGNode(result)) result = [result]
  if (Array.isArray(result) && result.length && result.every(isSGNode)) {
    for (const n of result) out.append(renderNode(n))
    return
  }
  const pre = document.createElement('pre')
  pre.textContent = typeof result === 'string' ? result
    : JSON.stringify(result, (k, v) => (isSGNode(v) ? `<SGNode ${v.label}>` : v), 2)
  out.append(pre)
}

// --- cells ------------------------------------------------------------------
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const names = Object.keys(scope)
const values = names.map((k) => scope[k])

async function runCell(getCode, out, status) {
  try {
    status.textContent = ' …'
    const fn = new AsyncFunction(...names, getCode())
    render(await fn(...values), out)
    status.textContent = ''
    return true
  } catch (e) {
    out.replaceChildren()
    const pre = document.createElement('pre')
    pre.className = 'cell-error'
    pre.textContent = String(e.stack ?? e)
    out.append(pre)
    status.textContent = ' ✗'
    return false
  }
}

const cells = []
for (const pre of document.querySelectorAll('pre.cell')) {
  const code = pre.textContent.trim()
  const wrap = document.createElement('div')
  wrap.className = 'cell-wrap'
  pre.replaceWith(wrap)
  const editorHost = document.createElement('div')
  editorHost.className = 'cell-editor'
  const bar = document.createElement('div')
  bar.className = 'cell-bar'
  const btn = document.createElement('button')
  btn.textContent = 'Run'
  const status = document.createElement('span')
  bar.append(btn, status)
  const out = document.createElement('div')
  out.className = 'cell-out'
  wrap.append(editorHost, bar, out)
  const view = new EditorView({ doc: code, parent: editorHost, extensions: [basicSetup, javascript()] })
  const cell = {
    run: () => runCell(() => view.state.doc.toString(), out, status),
    autorun: pre.classList.contains('autorun'),
  }
  btn.addEventListener('click', cell.run)
  cells.push(cell)
}

const runAll = async () => { for (const c of cells) await c.run() }
document.querySelector('#run-all')?.addEventListener('click', runAll)
if (new URLSearchParams(location.search).has('runall')) await runAll()
else for (const c of cells) if (c.autorun) await c.run()
```

- [ ] **Step 4: Write `docs/site.css`**

```css
:root { --ink: #1a1a1a; --soft: #f5f5f2; --line: #d8d8d2; --accent: #2456a4; }
* { box-sizing: border-box; }
body { margin: 0; color: var(--ink); font: 17px/1.6 Georgia, 'Times New Roman', serif; }
main { max-width: 46rem; margin: 0 auto; padding: 2rem 1rem 6rem; }
h1, h2, h3 { font-family: Helvetica, Arial, sans-serif; line-height: 1.2; }
h1 { font-size: 2.2rem; margin-top: 0; }
h2 { margin-top: 3rem; border-bottom: 1px solid var(--line); padding-bottom: .3rem; }
code, pre, .cell-editor { font: 14px/1.45 ui-monospace, Menlo, Consolas, monospace; }
a { color: var(--accent); }
table { border-collapse: collapse; }
th, td { border: 1px solid var(--line); padding: .3rem .6rem; text-align: left; }
.cell-wrap { margin: 1.2rem 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.cell-editor .cm-editor { background: var(--soft); }
.cell-bar { padding: .3rem .6rem; border-top: 1px solid var(--line); background: #fff; }
.cell-bar button { font: inherit; padding: .1rem .8rem; cursor: pointer; }
.cell-out { padding: .5rem .8rem; border-top: 1px solid var(--line); max-height: 24rem; overflow: auto; }
.cell-out pre { margin: 0; white-space: pre-wrap; }
.cell-out details { padding-left: 1rem; }
.sg-leaf { padding-left: 1rem; }
.cell-error { color: #a02020; }
```

- [ ] **Step 5: Verify in a browser**

```bash
npm run site:serve
```

Open `http://localhost:8123/?runall`. Expected: the smoke cell renders an
expandable Country → Sport → Year tree with record counts; no console
errors; editing the cell (e.g. removing `'Year'`) and clicking Run
re-renders. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add docs/index.html docs/livecells.js docs/site.css docs/vendor
git commit -m "docs site: live-cell runtime, import map, vendored dist"
```

---

## Task 9: site content

Prose + cells for all six sections. The mining review is a **STOP
checkpoint**: candidate material from the two old sources gets SG's yes/no
before anything is written in.

**Files:**
- Modify: `docs/index.html` (replace the smoke cell with the full content)

**Interfaces:**
- Consumes: cell conventions from Task 8; datasets from Task 7; the
  `DagBrowser` React component (`import { DagBrowser } from
  'dag-browser-widget'`, props `{ nodes, levelsExpanded }`).

- [ ] **Step 1: Mine the two old sources and STOP for SG review**

Read `git show origin/gh-pages:doc.md` and the Toptal article notes from
Task 7 Step 2. Produce a short candidate list in chat — for each: source,
what it is (example, motivating problem, comparison), and a
keep/adapt/drop recommendation. **Wait for SG's picks before writing
content.** (Known strong candidates: the fake-hospital-data motivating
walkthrough; the d3.nest/Underscore.groupBy comparison framing; the
d3-callback "datum that might have come from anywhere" tooltip argument.)

- [ ] **Step 2: Author sections 1-2 (positioning, quick start + core walkthrough)**

Draft prose (adjust per SG's Step 1 picks), then cells. Positioning draft:

> supergroup groups flat record collections — CSV rows, query results,
> event logs — into navigable structure. Where `d3.group` returns nested
> Maps (grouping, but no navigation) and `d3.hierarchy` navigates
> already-shaped trees (navigation, but no records and no multi-parent),
> supergroup fills the seam: every node carries its records, parents,
> children, path, depth, and aggregates. It also builds DAGs from
> parent-id data, sequence trees from event successors, and comparisons
> between two groupings. Zero dependencies; adapters emit plain objects
> for d3 and dag-browser-widget.

Core-walkthrough cells (each in a `<pre class="cell autorun">`):

```js
// group by country, sport, year — every level keeps its records
const sg = supergroup(athletes, ['Country', 'Sport', 'Year'])
return sg
```

```js
// navigation: node lookup by path, paths, parents
const sg = supergroup(athletes, ['Country', 'Sport', 'Year'])
const n = sg.node(['United States', 'Swimming'])
return {
  label: n.label, dim: n.dim, depth: n.depth,
  namePath: n.namePath(), records: n.records.length,
  children: n.children.map(String),
}
```

```js
// aggregates: agg over an accessor; union-safe rollup
const sg = supergroup(athletes, ['Country', 'Sport'])
const us = sg.node(['United States'])
return {
  medals: us.agg(r => r['Total Medals']),
  rollup: us.rollup(r => r['Total Medals']),
  pctOfAllRecords: us.pct().toFixed(3),
}
```

```js
// multi-valued dims and Date keys
const movies = [
  { title: 'Alien', genres: ['Horror', 'SciFi'], released: new Date('1979-05-25') },
  { title: 'Arrival', genres: ['Drama', 'SciFi'], released: new Date('2016-11-11') },
]
return supergroup(movies, [{ by: 'genres', multi: true }, 'released'])
```

If SG kept the hospital-data walkthrough in Step 1, add one or two
`patients`-based cells here (e.g. `supergroup(patients, ['Unit',
'Physician'])` with a `rollup(r => r.Charge)`); if SG kept a FIPS example,
add `supergroup(fips, ['state', 'county'])` sliced to one state.

- [ ] **Step 3: Author section 3 (DAG module + DBW embed)**

Cells:

```js
// parent-id data → DAG; multi-parent nodes appear once, cycles become backedges
const g = fromParentIds(containment)
return {
  roots: g.roots.map(String),
  multiParent: g.nodes.filter(n => n.parents.length > 1).map(String),
  backedges: g.backedges.map(e => `${e.parent} ⟲ ${e.child}`),
}
```

```js
// records meet the DAG: attach by node id, then union-safe rollups
const g = fromParentIds(containment, {
  records: [
    { entity: 'Specimen', n: 12 }, { entity: 'Aliquot', n: 30 },
    { entity: 'Assay', n: 7 }, { entity: 'Response', n: 55 },
  ],
  recordKey: r => r.entity,
})
const visit = g.nodes.find(n => n.id === 'Visit')
// union-then-sum: shared descendants counted once, never per-path
return { under: visit.rollup(r => r.n), induced: subgraph(g, ['Visit', 'Specimen', 'Aliquot']).nodes.map(String) }
```

DBW embed cell (not autorun — label it "interactive"):

```js
const { createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { DagBrowser } = await import('dag-browser-widget')
const nodes = toDagBrowserNodes(fromParentIds(containment))
const div = document.createElement('div')
div.style.height = '360px'
div.style.overflow = 'auto'
createRoot(div).render(createElement(DagBrowser, { nodes, levelsExpanded: 2 }))
return div
```

If the embed fails in the browser (esm.sh interop), fall back per spec:
replace the cell with `return toDagBrowserNodes(fromParentIds(containment))`
and prose noting the adapter output is exactly DBW's input shape.

- [ ] **Step 4: Author section 4 (sequence + icicle) with the lifeflow placeholder**

Linking cell (autorun; later cells use `hurricaneStarts` via window):

```js
// link each storm's events into next/prev chains; keep each storm's first event
const byStorm = d3.group(hurricanes, r => r.hur_id)
for (const evts of byStorm.values()) {
  evts.sort((a, b) => d3.ascending(a.date, b.date))
  evts.forEach((e, i) => { e.next = evts[i + 1] ?? null; e.prev = evts[i - 1] ?? null })
}
Object.assign(window, { hurricaneStarts: [...byStorm.values()].map(e => e[0]) })
return `${byStorm.size} storms linked`
```

```js
// what sequences of statuses do storms move through?
return groupBySequence(hurricaneStarts, { key: 'status', next: e => e.next, direction: 'forward', maxDepth: 3 })
```

```js
// anchored-both: align every storm on its first Hurricane event, look both ways
const anchors = hurricaneStarts
  .map(e => { let x = e; while (x && x.status !== 'Hurricane') x = x.next; return x })
  .filter(Boolean)
return groupBySequence(anchors, { key: 'status', next: e => e.next, prev: e => e.prev, direction: 'both', maxDepth: 2 })
```

Icicle cell (autorun):

```js
// toD3 + d3.partition: sequence tree as an icicle
const seq = groupBySequence(hurricaneStarts, { key: 'status', next: e => e.next, direction: 'forward', maxDepth: 4 })
const root = d3.hierarchy(toD3(seq)).sum(d => (d.children ? 0 : d.records.length))
d3.partition().size([320, 640])(root)
const color = d3.scaleOrdinal(d3.schemeTableau10)
const svg = d3.create('svg').attr('width', 640).attr('height', 320)
const cell = svg.selectAll('g').data(root.descendants()).join('g')
  .attr('transform', d => `translate(${d.y0},${d.x0})`)
cell.append('rect')
  .attr('width', d => d.y1 - d.y0 - 1).attr('height', d => Math.max(0, d.x1 - d.x0 - 1))
  .attr('fill', d => color(d.data.name))
cell.filter(d => d.x1 - d.x0 > 14).append('text')
  .attr('x', 4).attr('y', 13).attr('font-size', 11)
  .text(d => `${d.data.name} (${d.value})`)
return svg.node()
```

Placeholder prose after the icicle:

> A full LifeFlow-style temporal flow visualization of this data — the
> chart this module was distilled from — will join this page when the
> lifeflow/timelines rewrite lands.

- [ ] **Step 5: Author sections 5-6 (compare, migration)**

Compare cell:

```js
// same hierarchy, two years of budgets — where did counts move?
const y2010 = supergroup(budgets.filter(r => r.Year === 2010), 'Dept')
const y2011 = supergroup(budgets.filter(r => r.Year === 2011), 'Dept')
return compare(y2010, y2011)
```

(The renderer shows each node's `cmp.in` (a/b/both) and `countDelta`.
If the Step 1 review kept the Toptal/vs-hub value-set framing, add a second
cell comparing two `fromParentIds` value-set attachments with
`{ by: 'id' }`.)

Migration section: HTML table with the exact v1 → v2 rows from
[the v2 spec](../specs/2026-07-13-supergroup-v2-design.md) §"v1 → v2
migration sketch", plus links to the spec and NOTES.md.

- [ ] **Step 6: Full page check in a browser**

`npm run site:serve`, open `http://localhost:8123/?runall`.
Expected: every cell renders without error (check the console); the DBW
embed browses the containment DAG (self-loop shows as a backedge marker);
the icicle draws. Fix what doesn't. Stop the server.

- [ ] **Step 7: STOP — SG eyeballs the page** before commit (prose voice,
section order, anything to cut). Apply feedback.

- [ ] **Step 8: Commit**

```bash
git add docs/index.html
git commit -m "docs site: full content — core, dag+DBW, sequence, compare, migration"
```

---

## Task 10: README rewrite

**Files:**
- Modify: `README.md` (full replacement)

- [ ] **Step 1: Replace README.md** with (adjust the sequence/compare
snippets if Task 9 review changed the examples):

````markdown
# supergroup

Grouping for flat record collections that returns navigable structure:
every node carries its records, parents, children, path, depth, and
aggregates — the seam between `d3.group` (grouping, no navigation) and
`d3.hierarchy` (navigation, no records, no multi-parent).

Zero dependencies. ESM, TypeScript types included.

**Live docs and demos: <https://sigfried.github.io/supergroup/>**

## Install

```sh
npm i supergroup
```

## Quick start

```js
import { supergroup } from 'supergroup'

const sg = supergroup(records, ['Country', 'Sport', 'Year'])
sg.roots.map(String)                      // ['United States', 'Russia', …]
const n = sg.node(['United States', 'Swimming'])
n.records.length                          // records at every level, not just leaves
n.namePath()                              // 'United States/Swimming'
n.agg(r => r['Total Medals'])             // { count, sum, mean, min, max }
```

Dimensions can be field names, accessor functions, or specs
(`{ by: 'genres', multi: true }` fans one record into several groups;
Date-valued keys group by value).

## DAGs from parent-id data

```js
import { fromParentIds, subgraph } from 'supergroup/dag'

const g = fromParentIds(items)            // { id, name?, parentIds? }[]
```

Multi-parent nodes appear once with plural `parents`; cycles (including
self-loops) are kept as `g.backedges`, never dropped. Attach records by
node id and get union-safe rollups (`rollup` dedups shared descendants —
union-then-aggregate, never sum-over-paths). `subgraph(g, ids)` extracts an
induced subgraph.

## Sequences

```js
import { groupBySequence } from 'supergroup/sequence'

groupBySequence(startEvents, { key: 'status', next: e => e.next, direction: 'forward' })
```

Groups event chains level by level — each level groups the previous
level's successors. `direction: 'backward'` walks `prev`; `'both'` builds
forward and backward trees from anchor events under one synthetic root.

## Comparison

```js
import { compare } from 'supergroup/compare'

const diff = compare(groupingA, groupingB)   // or { by: 'id' } for DAGs
diff.roots[0].cmp                            // { in: 'a'|'b'|'both', countDelta, a, b }
```

## Adapters

```js
import { toD3, toDagBrowserNodes } from 'supergroup/adapters'
```

Plain duck-shaped output: `toD3` feeds `d3.hierarchy`; `toDagBrowserNodes`
feeds [dag-browser-widget](https://www.npmjs.com/package/dag-browser-widget).

## Migrating from v1

| v1 | v2 |
|---|---|
| `_.supergroup(recs, dims)` | `import { supergroup } from 'supergroup'` |
| `_.addSupergroupMethods(arr)` | gone — collections are `Supergroup` instances |
| `list.asRootVal()` | `supergroup(recs, dims, {root: 'synthetic'})` |
| `_.multiValuedGroupBy` | `dims: [{by, multi: true}]` |
| `_.hierarchicalTableToTree` | `fromParentChild` (supergroup/dag) |
| `_.sgCompare` / `_.sgDiffList` | `compare` (supergroup/compare) |
| `_.stateClass` / `State` | app-owned selection + `recordsFor`/`recordsUnder` |
| boxed String/Number values | plain `SGNode` (`label`, `toString()`) |

v1 sources live in [`legacy/`](legacy/); the version archaeology is in
[NOTES.md](NOTES.md).

## Development

```sh
npm test              # vitest
npm run typecheck
npm run build         # tsc → dist/
npm run build:site    # build + vendor dist into docs/
npm run site:serve    # serve the docs site locally
```

Design docs: [docs/specs/](docs/specs/). MIT license.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: v2 README — quick start, module tour, migration table"
```

---

## Task 11: `legacy/` move + planning-doc cleanup

**Files:**
- Move: `supergroup.js`, `old_doc.html`, `old_groc.index.html`,
  `bower.json`, `oldDemoStuff/`, `oldTests/`, `assets/`,
  `test/supergroup_vows.js`, `test/tree_test_data.csv` → `legacy/`
- Create: `legacy/README.md`
- Modify: `NOTES.md` (status banner)

- [ ] **Step 1: Move**

```bash
mkdir legacy
git mv supergroup.js old_doc.html old_groc.index.html bower.json oldDemoStuff oldTests assets legacy/
git mv test/supergroup_vows.js test/tree_test_data.csv legacy/
```

- [ ] **Step 2: Write `legacy/README.md`**

```markdown
# legacy — supergroup v1 artifacts

The pre-2.0 line: `supergroup.js` (the prototype-based v1 source),
its vows tests, and the old demo/doc assets. Kept for reference only —
nothing here ships to npm or runs against the v2 source in `../src/`.
The full story of the three divergent v1 lineages is in
[../NOTES.md](../NOTES.md).
```

- [ ] **Step 3: Add a status banner to `NOTES.md`** (insert after the H1):

```markdown
> **Status (2026-07): resolved by the v2 rewrite.** supergroup 2.0.0
> (ESM/TypeScript, `src/`) shipped; v1 artifacts moved to
> [legacy/](legacy/). This file remains as the record of the v1
> divergence and the consumer research that shaped v2 — see
> [docs/specs/](docs/specs/) for the v2 design.
```

- [ ] **Step 4: Verify nothing broke**

```bash
npm run typecheck && npx vitest run && npm run build && npm run build:site
```

Expected: all green (nothing in `src/`/`test/` referenced the moved files).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: move v1 artifacts to legacy/, NOTES.md status banner"
```

---

## Task 12: flip GitHub Pages to master `/docs` and verify live

- [ ] **Step 1: Confirm with SG, then flip the Pages source** (SG can click
Settings → Pages → Source: Deploy from a branch → `master` / `/docs`, or
with SG's OK run):

```bash
gh api -X PUT repos/Sigfried/supergroup/pages \
  -f 'source[branch]=master' -f 'source[path]=/docs'
```

- [ ] **Step 2: Push master** (needs SG's go-ahead per standing rules):

```bash
git push origin master
```

- [ ] **Step 3: Verify the live site** (Pages builds take a minute or two):

```bash
curl -sI https://sigfried.github.io/supergroup/ | head -3
curl -s https://sigfried.github.io/supergroup/ | grep -c 'class="cell'
```

Expected: `HTTP/2 200`; cell count > 0. Then SG (or executor with a
browser) loads `https://sigfried.github.io/supergroup/?runall` and confirms
cells run — CDN imports behave the same as locally, but confirm.

---

## Task 13: publish 2.0.0

- [ ] **Step 1: Pre-publish gate**

```bash
npm run prepublishOnly    # typecheck + tests + build, all green
npm pack --dry-run        # inspect: dist/**, README.md, LICENSE, package.json — nothing else
```

- [ ] **Step 2: STOP — SG publishes** (`npm publish` needs SG's npm auth/2FA;
alternatively SG says the word and the executor runs it):

```bash
npm publish
```

- [ ] **Step 3: Verify**

```bash
npm view supergroup version dist-tags
```

Expected: `2.0.0`, `latest: 2.0.0`. Optionally re-run Task 6's smoke against
the registry: in a scratch dir, `npm i supergroup@2` + `node smoke.mjs` →
same output.

- [ ] **Step 4: Tag**

```bash
git tag v2.0.0 && git push origin v2.0.0
```

---

## Task 14: post-publish pointers

**Files:**
- Modify: `/Users/sgold15/github-repos/dynamic-model-var-docs/CLAUDE.md`
- Modify: `/Users/sgold15/github-repos/personal/hub/projects/lifeflow/README.md`

- [ ] **Step 1: dmvd CLAUDE.md pointer** — append this line in a sensible
spot (near other library/tooling notes, or at the end):

```markdown
- supergroup v2 is published: grouping + DAG constructors (poly-parent,
  cyclic) + a `toDagBrowserNodes` adapter that replaces the hand-written
  containment adapter for the Focus view; also sequence grouping and
  hierarchy compare. Capabilities spec:
  https://github.com/Sigfried/supergroup/blob/master/docs/specs/2026-07-13-supergroup-v2-design.md
```

- [ ] **Step 2: hub lifeflow README note** — append:

```markdown
## supergroup v2 shipped (2026-07)

supergroup 2.0.0 is published with first-class sequence grouping
(`groupBySequence`: forward/backward/anchored-both) — the capability
lifeflow used to fake with `preGroupRecsHook` and hand-rolled recursion.
Its demo site (https://sigfried.github.io/supergroup/) has only a small
sequence demo for now. **When the lifeflow/timelines rewrite happens, add
the full LifeFlow demo to the supergroup demo page** — the page carries a
placeholder pointing back here.
```

- [ ] **Step 3: Commit each repo's change** (each is its own repo; commit
with a one-line message; do not push without SG's OK):

```bash
cd /Users/sgold15/github-repos/dynamic-model-var-docs && git add CLAUDE.md && git commit -m "note: supergroup v2 published (toDagBrowserNodes adapter available)"
cd /Users/sgold15/github-repos/personal/hub && git add projects/lifeflow/README.md && git commit -m "lifeflow: supergroup v2 shipped; reminder to add lifeflow demo to its site"
```

- [ ] **Step 4: Ask SG about retiring the old `gh-pages` branch** (delete
`origin/gh-pages` now that Pages serves master `/docs`, or keep it as an
archive — SG's call; deleting is `git push origin --delete gh-pages`).
