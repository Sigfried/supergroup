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
