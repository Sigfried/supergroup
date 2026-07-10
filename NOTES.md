# Work notes — untangling supergroup's versions

Working notes for the maintainer, not user docs (see [README.md](README.md)
for what supergroup is). This file tracks the open problems surfaced from
downstream use, ahead of a clean release.

## The core problem: three divergent supergroups (discovered 2026-07-07)

There are effectively **three different codebases** all calling themselves
supergroup, and they don't agree:

| Where | Version | Style | State |
|---|---|---|---|
| Repo HEAD (`supergroup.js`) | header says 1.1.8, `package.json` says 1.1.9 | **prototype-based** (`function List(){}`, `.prototype.x=`) | no `dist/`; `main` → `supergroup.js`; last commit 2023-09 |
| npm `latest` | 1.1.9 | **class-based, transpiled** (Babel: `class`, `new.target`, array generics) | **BROKEN in every browser** (see below) |
| DrugExposureExplorer pins | 1.1.3 | class-based transpiled | same bug family; patched downstream |

So the repo source and the published 1.1.9 are **not the same program** — npm
1.1.9 was transpiled from the class-based source on the **`es6` branch** (see
Branch archaeology below); repo HEAD is the older prototype-based line.
`package.json` version (1.1.9) also doesn't match the source header (1.1.8).
This divergence is the root cause of the DrugExposureExplorer build pain and
needs untangling before any clean release.

## The runtime bug (why published supergroup is browser-broken)

The class-based transpiled dist (npm 1.1.9, and 1.1.3) uses **Firefox-only
"array generics"** — `Array.map(this, …)`, `Array.filter(this, …)`, etc. —
which every non-Firefox engine dropped years ago (Firefox itself removed them
~2019). Any browser consumer crashes: on load for the eager call sites, or
lazily (blank charts) for the ones only hit on certain code paths. Six call
sites total.

**The fix** (verified working end-to-end in DrugExposureExplorer, 2026-07-07):
replace each generic with a `.prototype` call over a **copied** array —
```
(_ArrayN = Array).X.apply(_ArrayN, [this].concat(args))
   → Array.prototype.X.apply(Array.from(this), args)
Array.filter(this, filt)
   → Array.prototype.filter.call(Array.from(this), filt)
```
The `Array.from(this)` copy matters: because Supergroup subclasses Array, a
plain `Array.prototype.map.call(this, …)` recurses back into the species
constructor `new Supergroup()` and throws; copying to a plain array breaks that.

NB: the **repo-HEAD prototype-based source may not have this bug at all** (it
predates the class rewrite). Verify which lineage you actually want to ship
before patching — the right fix might be "publish the prototype-based source"
rather than "patch the transpiled dist."

## Known downstream consumers (check before releasing)

- **DrugExposureExplorer** — pins 1.1.3 and carries build/runtime patches for
  the bug above; a fixed release collapses those into `npm i supergroup@latest`.
- **TermHub / VS-Hub** — used supergroup (see the `hierarchicalTableToTree`
  performance giving-up commit in this repo's history, which references
  termhub). Confirm current usage + version before bumping.
- **Supergroup docs demo** (`sigfried.github.io/supergroup`) — loads its own
  copy; **likely browser-broken by the same array-generics bug**. NOT yet
  verified in a current browser — do that; if broken, it's arguably
  higher-priority than DrugExposureExplorer since it's public.

## What "update supergroup" should probably mean (unresolved)

Options, cheapest first:
1. **Minimal patch release (~1 hr):** just the 6 array-generics fixes + a
   correct `main`, cut a 1.1.10. Unbreaks DrugExposureExplorer and the public
   docs demo, no modernization. Requires first resolving *which source lineage*
   is canonical.
2. **Reconcile the divergence:** decide prototype-based (repo HEAD) vs
   class-based (npm) is the real one, delete the other, make `package.json`
   version / source header / npm agree.
3. **Full modernization (day+):** ESM build, current lodash story, tests,
   types. Its own project with its own dead ends — defer.

## Branch archaeology (reviewed 2026-07-09)

**The missing 1.1.9 source is `origin/es6`** (`src/supergroup.js`, tip
`db38a3a`, 2016-06). Evidence:

- Real classes (`class Supergroup extends SGNodeList`, Array subclasses via
  `babel-plugin-transform-builtin-extend`) matching the published build.
- The Firefox-only array generics — `Array.map(this, …)` (223),
  `Array.filter(this, …)`, `Array.slice(this, …)` (758–764) — appear **only on
  this branch** in all of git history (`git log --all -S 'Array.map(this'`).
  They're hand-written source (Firefox supported them at the time), not Babel
  artifacts.
- `.babelrc` (es2015 + stage-0 + transform-builtin-extend with
  `globals:["Array"]`) is exactly the toolchain that emits the `new.target`
  guards seen in the npm dist. The build wrote to `dist/`, which was **never
  committed** — hence the source seemed missing.
- Caveat: the branch's own package.json reads `supergroup-es6 v0.1.5` (an
  alias-publish experiment); 1.1.9 was a separate local transpile published
  under the main name.

The other branches:

| Branch | Tip date | What | Verdict |
|---|---|---|---|
| `es6` | 2016-06 | Class rewrite (`SGNode`/`SGNodeList`/`Supergroup`/`Filter`); mocha tests; Date-grouping fix | The 1.1.9 lineage; reference for intended design |
| `biggerRefactorAbandoned` | 2016-02 | Classes + generic `SGTree`/`TreeNode` split (`src/tree.js`); `SGState`; webpack browser tests | "Getting too complex quickly" — design ideas only |
| `copilot/refactor-supergroup-function` | 2026-01 | TypeScript + Vue 3 composables "v2.0"; claims all 30 legacy tests pass; `toD3Entries`/`toD3Map` helpers; dual ESM/CJS | Types & module structure salvageable; Vue coupling probably unwanted |
| `d3_extension` | 2015-06 | Bridge to `d3.nest`/`d3.layout.hierarchy` | Explicitly rejected — "better to just stick with supergroup" |
| `2023_refactor_of_hierarchicalTableToTree` | 2023-05 | `giveChildrenTo` + polyhierarchy support in `hierarchicalTableToTree` | Works but "super slow" — the one real unmerged feature |
| `module_version` | 2014-02 | Early CommonJS/bower/webpack packaging | Historical; master descends from it |

(`gh-pages` = published docs/demo site, not source.)

No stashes; no local-only branches.

## Family tree: sibling projects

Chronological lineage (all public repos under `Sigfried`):

1. **enlightened-data.js** (2013-12) — the direct ancestor: same
   grouping/hierarchy engine as a plain module object (`enlightenedData.group(
   list, dim, opts)`), **no mixin**. Lives inside `lifeflow` (local checkout:
   `lifeflow/enlightened-data/enlightened-data.js`) and `treelike`.
   supergroup's `diffGroup`/`compare` block is copied from it verbatim, and
   supergroup still carries "KLUDGE for treelike" comments.
2. **underscore-unchained** (2014-05, npm 0.0.2) — the auto-chaining trick
   (`_.unchain`, `_.prometheus`) extracted as its own generic mixin; what
   became `addSupergroupMethods`.
3. **treelike** (2013–2015) — CSV/JSON shape-explorer built on
   enlightened-data; its many-to-many "merge" feature is an early
   DAG/polyhierarchy browser (ancestral to `dag-browser-widget`).
4. **sequence-viz** (npm 0.0.5) **= lifeflow** — the packaged LifeFlow
   implementation (`lifeflow/package.json` name is `sequence-viz`); the main
   real npm consumer (`supergroup ^1.0.13`, d3 ^3, moment). The local lifeflow
   checkout predates the split and still calls enlightened-data directly.
   `lifeflow/ISSUES.md` is a live backlog (updated 2026-06).

## Modernization notes (discussion in progress, 2026-07)

- **Drop the `_.mixin` form.** Lodash is in maintenance mode and a
  peer-dependency nobody wants; mutating a shared `_` defeats tree-shaking and
  TypeScript; the chaining problem it solved is gone (native array methods).
  enlightened-data already had the right shape: plain module exports.
- **The ecosystem absorbed the easy half.** `d3.nest` → `d3.group`/`d3.rollup`
  (nested InternMaps, Date keys work); ES2024 `Map.groupBy`/`Object.groupBy`;
  `d3.hierarchy`/`d3.stratify` cover single-parent trees with
  `ancestors()`/`descendants()`/`leaves()`/`path()`/`sum()`.
- **What's still unfilled** (supergroup's remaining niche): one call from flat
  records to a navigable tree whose nodes carry `.records`, parent, path,
  depth, aggregates (the seam between d3.group and d3.hierarchy);
  **polyhierarchy/DAG** grouping (d3.stratify throws on multiple parents);
  hierarchy **comparison** (`compare`/`diffGroup`).
- Skeptical notes: boxed String/Number Values are TS-hostile — plain node
  objects with `toString()`/`.label` instead; `extends Array` caused most
  historical pain (species recursion, the transpile bug) — prefer composition
  or `Symbol.species = Array`.
- Candidate shape: small ESM/TS core — `supergroup(records, dims, opts)`,
  `fromParentChild()` (stratify-for-DAGs; salvage the 2023 polyhierarchy work
  with a perf rethink), `compare()`, aggregates; explicit `.toD3()`-style
  adapters rather than duck-typing d3's node interface. Framework adapters
  (the copilot branch's Vue composables) separate, if at all.
- Open questions: DAG support in core vs follow-on; exact d3 interop; whether
  lifeflow/sequence-viz revival drives requirements (its ISSUES.md as input).
- d3 interop resolved: explicit `.toD3()` conversion, not duck-typed
  compatibility — d3 layouts mutate their nodes, and DAG→d3.hierarchy
  necessarily picks an unfolding, which needs an explicit call site.

## What consumers actually need (code dives, 2026-07-09)

### lifeflow / sequence-viz

- Never uses fixed-dimension-list grouping. The sequence tree is iterated
  single-dim grouping where each level first maps records to their successor
  (`next()`/`prev()`) and then groups by event name — implemented by abusing
  `preGroupRecsHook` as a graph walk (lifeflowData.js:17-23) because the
  library has no native successor grouping.
- enlightened-data's own `recurse` option is commented out ("moving recursion
  out to the caller"); lifeflow hand-rolls recursion (`addChildren`) plus a
  fabricated synthetic root.
- Heavily used: `.records`/counts on every node; `namePath`/`pedigree`/
  `flattenTree` (D3 join keys, tooltips); `lookup`. Never used: `aggregate`,
  `compare`/`diffGroup`. No moment.js anywhere (plain Date arithmetic).
- Required of a modern supergroup: working recursive tree grouping with
  optional synthetic root; first-class successor/sequence grouping including
  backward direction (align-by-end/middle builds both directions from an
  anchor; `backwards` honored by path methods); records+counts per node;
  path APIs + flatten; lookup that doesn't fight `Object.freeze`; sorts that
  return group-typed collections. Nice-to-have: per-node agg (count/mean over
  an accessor), ordered-children option, per-record values alongside
  aggregates.

### DAG consumers (dag-browser-widget, vs-hub, icd11-playground)

- **None of the three uses supergroup.** All hand-roll the same stack:
  edge-list→adjacency graph (or graphology); DAG→tree unfolding (one row per
  root-to-node path, multi-parent nodes repeat); per-OCCURRENCE expansion
  state + visible-row sweep; union-deduped descendant closure and counts;
  depth/height assignment; induced-subgraph extraction.
- dag-browser-widget already IS the extractable display-structure library
  (unfolding, occurrence bookkeeping, visibility); vs-hub and
  icd11-playground each duplicate much of it.
- Where records meet the DAG — supergroup's actual opening: vs-hub's `drc`
  rollup = union descendant set, then sum patient counts
  (GraphState.jsx:494-550) — union-then-sum, never sum-over-paths; plus
  value-set comparison over the hierarchy (the `compare`/`diffGroup`
  lineage's natural modern home).
- Shared scaling risk: eager full unfolding (vs-hub gates expandAll at 2000
  rows; icd11 materializes ~200K rows from 69K nodes and precomputes metrics
  offline in Python). The core must not eagerly materialize path-rows.

### dynamic-model-var-docs (BDCHM/LinkML schema browser; Focus view)

- **Already a dag-browser-widget consumer**: the Focus view's containment
  digraph is DBW (`dag-browser-widget@^0.2.0`), fed by a hand-written
  `{id, name, parentIds}` adapter (`DataService.getContainmentNodes`). A
  shipped `.toDagBrowserNodes()` adapter replaces code it maintains today.
- The containment graph is poly-parent **and cyclic** (real self-loops, e.g.
  `ResearchStudy part_of ResearchStudy`) — so the edge-table constructor must
  accept general digraphs and mark back-edges (as DBW does), not assume
  acyclicity.
- Genuine unbuilt-feature fit: group-by-dims for the category selector and
  the deferred per-entity nesting panel ("group flat elements by facet,
  render expandable tree with `.records`").
- No consumer for: rollup aggregation, compare, d3 adapter, sequence
  grouping. Class inheritance there is single-parent and shallow (solved
  trivially). The fragile part — the FK-inversion heuristic deriving
  containment from the schema — is domain logic supergroup can't own.
- Verdict: don't block dmvd work on supergroup; adopt the adapter + nesting
  once v2 exists.

### Emerging factoring (proposal, not settled)

- supergroup v2 = the **records layer**: a small node model (label,
  `.records`, parents **plural**, children) + constructors —
  `groupBy(records, dims)`, `groupBySequence(records, {step, backwards})`,
  `fromParentIds(nodes)` / `fromParentChild(table)` — plus navigation,
  union-safe aggregation (count / agg-over-accessor / weighted
  union-then-sum), and `compare()`. Explicit adapters out: `.toD3()`,
  `.toDagBrowserNodes()`, maybe `.toGraphology()`.
- No display state in core (drop the old `State` class); expansion/
  visibility/occurrences stay in dag-browser-widget.
- Parents-plural is the one DAG-enabling decision in the core; graph-structure
  operations beyond that stay in dag-browser-widget/graphology rather than
  being duplicated here.
