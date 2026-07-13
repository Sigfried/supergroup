# supergroup v2 — design spec

Status: approved design, pre-implementation. Requirements research behind
every decision here is in [NOTES.md](../../NOTES.md) (branch archaeology,
consumer code dives: lifeflow/sequence-viz, dag-browser-widget, vs-hub,
icd11-playground, dynamic-model-var-docs).

## Purpose

One call from flat records (or an edge table) to a navigable tree/DAG whose
nodes carry their records, parents, path, depth, and aggregates — the seam
between `d3.group` (grouping, no navigation) and `d3.hierarchy` (navigation,
no records, no multi-parent) that neither fills.

## Goals

- Replace the `_.mixin` / lodash-coupled v1 with plain ESM/TypeScript exports.
- Serve the three proven consumer patterns:
  1. **dmvd / dag-browser-widget**: build poly-parent (and cyclic) structures
     from parent-id data and feed the widget (M1).
  2. **lifeflow**: successor/sequence grouping, both directions, working
     recursion (M2).
  3. **vs-hub-style analytics**: union-safe rollups; value-set comparison (M1
     rollups, M3 compare).
- Stay dependency-free; adapters emit duck-shaped plain objects.

## Non-goals

- Display state: expansion, visibility, selection *storage*, DAG→rows
  unfolding and per-occurrence bookkeeping — all remain in dag-browser-widget
  or the app. (v1's `State` class is replaced by pure derivation helpers; see
  Selection.)
- Graph layout, general graph algorithms (use d3/ELK/graphology), data
  loading/parsing.
- Fixing the published 1.x line (NOTES.md option 1, the 1.1.10 patch) —
  orthogonal to this spec; may or may not happen.

## Settled decisions

| Decision | Choice | Why |
|---|---|---|
| Identity | `supergroup@2.0.0`, same repo | Portfolio continuity; a breaking rewrite is what a major bump is for |
| Module format | ESM-only, TypeScript source, `tsc` build to `dist/` (ESM + `.d.ts`) | 2026 baseline; consumers are modern apps |
| Dependencies | Zero runtime deps | Family tradition; adapters emit duck shapes instead of importing d3/DBW |
| Representation | Wrapper class + plain node objects | No `extends Array` (source of most v1 pain), no boxed String/Number values (TS-hostile) |
| Laziness | None — all indexes/metrics eager at construction | v1's lazy `lookupMap` fought `Object.freeze`; consumers precompute anyway |
| Display state | Excluded | Both 2016 refactors died growing `FilterSet`/`SGState`; apps own state now |

## Module layout (subpath exports)

```
supergroup            core: node model, supergroup(records, dims), navigation,
                      aggregates, selection helpers
supergroup/dag        fromParentIds / fromEdges / fromParentChild, cycle
                      handling, maxDepth/height, subgraph, union rollups
supergroup/sequence   groupBySequence (successor/prefix, directional)   [M2]
supergroup/compare    hierarchy / value-set diff                        [M3]
supergroup/adapters   toDagBrowserNodes, toD3
```

Modules communicate only through the node model. Existing v1 files
(`supergroup.js`, `oldDemoStuff/`, `oldTests/`) move to `legacy/` when 2.0
ships, not before.

## Core node model

```ts
class SGNode<R> {
  id: string              // stable within the collection: source id when the
                          // constructor had one, else the path string
  key: unknown            // raw group key (string | number | Date | …)
  label: string           // display form; toString() returns this
  dim?: string            // which dimension/level produced this node
  records: R[]
  parents: SGNode<R>[]    // PLURAL — the one DAG-enabling core decision
  children: SGNode<R>[]
  depth: number           // tree depth; on DAGs, min-depth from any root
}
```

Node methods:

- `ancestors()`, `descendants()`, `leaves()` — deduped by node identity
  (never path-multiplied).
- `path()` (key array), `namePath(sep = '/')`, `pedigree()`.
- `agg(accessor)` → `{count, sum, mean, min, max}` over own `records`.
- `rollup(accessor?)` — union `recordsUnder` first, then aggregate
  (**union-then-aggregate, never sum-over-paths** — the vs-hub `drc`
  semantics; a record reachable by many paths counts once).
- `pct()` — `records.length` / total records in the collection.
- `groupChildren(dim, opts)` — regroup this node's records into children;
  the working replacement for v1's `extendGroupBy` and the primitive that
  sequence grouping builds on.

Collection:

```ts
const sg = supergroup(records, dims, opts?)
// dims: (string | ((r: R) => unknown) | DimSpec)[]
// DimSpec: { by: string | fn, name?: string, multi?: boolean, sortChildren?: comparator }
//   multi: true → accessor may return an array; record lands in several
//   sibling groups (v1's multiValuedGroupBy)
// opts: { root?: 'none' (default) | 'synthetic', excludeValues?: unknown[] }

sg.roots                  // SGNode<R>[]  (with root:'synthetic', sg.root too)
sg.nodes                  // all nodes, DFS order
sg.flatten()              // === sg.nodes: each node ONCE, even multi-parent
                          // ones (path-row unfolding is DBW's job, not ours)
sg.node('RxNorm/Drug')    // path lookup; also sg.node(['RxNorm', drugKey])
sg.select(predOrKeys)     // SGNode<R>[]
```

### Selection (replaces v1 `State`)

v1's `State` (selection tracking with `selectedRecs()`; real user:
mkt-timing-eval) is replaced by stateless derivation — the app owns the
selection (React state, URL), supergroup only derives:

```ts
recordsFor(nodes)     // union of .records across nodes
recordsUnder(nodes)   // union including descendants, deduped node-wise
```

## dag module

Constructors — all accept **general digraphs, not just DAGs** (dmvd's
containment graph has real self-loops):

```ts
fromParentIds(items)            // {id, name, parentIds}[] — DBW's input shape
fromEdges(edges, nodes?)        // [parentId, childId][]
fromParentChild(rows,           // successor to hierarchicalTableToTree;
  { parent, child, label? })    // parent/child/label are column names or
                                // accessors. Salvages the 2023 branch's
                                // polyhierarchy semantics, non-quadratically
```

Cycle discipline (dag-browser-widget's, adopted wholesale): roots =
in-degree-0 nodes, plus, per rootless cycle region,
its first member (input order) promoted to a root
so nothing vanishes; edges that would close a cycle are recorded in
`sg.backedges` (`{parent, child}[]`, self-loops included) and excluded from
`children`/`parents` traversal, so all traversals terminate.

Records attach via constructor option `{records, recordKey}` or post-hoc
`attachRecords(sg, records, byKey)` — nodes without records get `records: []`.

DAG extras: per-node `maxDepth` (longest path from a root) and `height`
(longest path to a leaf), computed eagerly; `subgraph(sg, ids)` (supergroup/dag) — induced sub-DAG over a node set
(the vs-hub value-set case), returning a new collection. A function, not
a method, so the core module stays dag-free.

Scaling rule: the core never materializes path-rows (one row per
root-to-node path). That eager unfolding is the shared scaling risk found in
all three DAG consumers and it stays in DBW, on demand.

## sequence module (M2)

```ts
groupBySequence(startRecords, {
  key,                    // event-name accessor
  next, prev?,            // successor / predecessor accessors on records
  direction: 'forward' | 'backward' | 'both',   // 'both' requires prev
  maxDepth?,
})
```

Level n+1 groups each node's records' successors (`next`/`prev`) by `key` —
what lifeflow fakes by abusing `preGroupRecsHook` as a graph walk plus
hand-rolled recursion. `'both'` builds forward and backward trees from the
anchor records under one synthetic root; nodes carry `direction`, and
`path()`/`namePath()` order themselves accordingly (replacing
enlightened-data's `//kludgy?` reverse). Records with no successor simply
fall out of the next level (they remain in the current node's `records`).

## compare module (M3)

`compare(a, b, opts?)` → a merged collection whose nodes carry
`{in: 'a' | 'b' | 'both', a?: SGNode, b?: SGNode, countDelta: number}`.
Nodes matched by path (tree collections) or id (dag collections). The
`diffGroup` lineage; target use case is comparing two value sets over the
same concept hierarchy.

## adapters

- `toDagBrowserNodes(sg)` → `{id, name, parentIds}[]` — exactly
  dag-browser-widget's input; replaces the hand-written adapter dmvd
  maintains today (`DataService.getContainmentNodes`). Back-edges are
  re-included here as parent links (DBW handles its own cycle marking).
- `toD3(nodeOrSg, {onRepeat: 'firstOccurrence' | 'repeat'})` → plain nested
  `{…, children: […]}` objects consumable by `d3.hierarchy()`. d3 can't
  represent a DAG, so the unfolding decision is made explicitly here:
  `firstOccurrence` keeps one copy of a multi-parent node, `repeat`
  duplicates the subtree per parent. No d3 import; output is duck-shaped.

## Testing & tooling

- vitest; `tsc --noEmit` as the typecheck gate.
- Port the intent of v1's vows/mocha suites (master + `es6` branch) as the
  regression floor — grouping correctness, Date keys, lookup, paths,
  aggregates.
- Consumer-shaped fixtures: a small parentIds digraph with a self-loop and a
  multi-parent node (dmvd containment shape) for dag; lifeflow's hurricane
  event data for sequence (M2).
- Type-level tests for generic inference (`SGNode<R>` flowing from the
  records argument).

## Milestones

| | Contents | Acceptance |
|---|---|---|
| **M1** | core + dag + `toDagBrowserNodes` + selection helpers | dmvd could replace `getContainmentNodes` with the adapter; union rollup correct on a multi-parent fixture |
| **M2** | sequence + `toD3` | rewritten lifeflow demo runs on v2 (no `preGroupRecsHook` hack, no manual recursion, no synthetic-root fabrication) |
| **M3** | compare | value-set diff rendered over a shared hierarchy |

After M1 is pushed, add a one-line pointer in dmvd's CLAUDE.md to this spec's
GitHub URL so dmvd work sessions know the available capabilities.

## v1 → v2 migration sketch

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
