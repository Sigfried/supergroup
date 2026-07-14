# supergroup v2 — docs milestone design

Status: approved design, pre-implementation. Follows the
[v2 design spec](2026-07-13-supergroup-v2-design.md) (M1–M3 complete on
master). This milestone ends with 2.0.0 published as `latest`.

## Deliverables

1. Live demo/documentation site served from `docs/` on master
   (`sigfried.github.io/supergroup`, Pages-from-branch, master `/docs`).
2. Rewritten README.
3. v1 artifacts moved to `legacy/`.
4. Packaging: `exports` map, dist build, 2.0.0 metadata.
5. M1 deferred-minors checklist cleared (gates publish).
5b. Library additions driven by the site's no-magic display rule:
   `supergroup/formatting` module + `SGNode.dimPath` (see "Library
   additions" below).
6. `npm publish` of 2.0.0 as `latest`.
7. Post-publish pointers: dmvd CLAUDE.md one-liner; note in
   `~/github-repos/personal/hub/projects/lifeflow/README.md`.

## Demo/doc site

### Architecture

Single static page, no build tooling (matches the zero-dep tradition).
GitHub Pages serves master `/docs` via the built-in "deploy from a branch"
setting — publishing is a side effect of `git push`. The old `gh-pages`
branch is retired after the new site is live.

```
docs/index.html              the page: prose + live code cells
docs/livecells.js            cell runtime (editor, Run, result rendering)
docs/site.css                styles
docs/vendor/supergroup/      built dist/, copied in by `npm run build:site`
docs/data/                   demo datasets (below)
docs/specs/, docs/plans/     existing planning docs (publicly served, fine)
```

Key trick: Pages only serves files under `docs/`, so the site imports a
**committed vendored copy** of the built library (`docs/vendor/supergroup/`)
rather than `../dist` or a CDN. No chicken-and-egg with the npm publish; the
page works locally (any static server) and on Pages identically. An npm
script (`build:site`) runs the dist build and copies it in; CI-free, so
keeping it fresh is a documented manual step in the release checklist.

External libraries — d3, CodeMirror, dag-browser-widget — load from esm.sh
via an import map. **Verify early** that dag-browser-widget loads as browser
ESM from esm.sh; if it can't, its demo degrades to pretty-printed
`toDagBrowserNodes` output.

### Live cells

Each example is an editable cell (CodeMirror 6 from CDN) with Run and
Clear buttons. Mechanics revised 2026-07-14 after SG review of the first
draft (ee419e2):

**Run.** No cell runs on page load. Output boxes start with a muted
placeholder ("Run to evaluate"). Run gives visible feedback: a running
state on the button, `✓ 8ms` status on success, `✗` plus the error text
in the output on failure. Shift-Enter runs the focused cell. A "Run all"
control stays at the top of the page, and `?runall` still runs every
cell (used by the headless check).

**Cell semantics.** Cell code has no `return` and no top-level `const`:
the value of the last statement is the cell's output (Observable-style).
Execution wraps the code in a sloppy-mode direct `eval` inside an async
function (`return eval(code)`), which gives exact completion-value
semantics for multi-line final expressions. Bare assignments (`sg = …`)
therefore land on `window` — cells publish their variables for console
inspection; last run wins when two cells assign the same name. The cell
bar shows what a run published (`→ window: sg, n`). Clear empties the
output and deletes exactly the window vars that cell published. `let`/
`const` typed while editing stay private to the cell. `await` is
unavailable inside `eval` code (no cell uses it); if a cell's output is
a thenable, the runtime awaits it before rendering.

**Display: no magic.** The renderer type-sniffs nothing from the
library: a DOM node appends as-is (d3 SVGs, the DBW embed), a string
renders in a `<pre>`, anything else pretty-prints as circular-safe JSON.
Anything shaped that the site displays is produced by an explicit
formatting function the reader could call in their own console (see
"Library additions"). Cells that show structure end with e.g.
`prettyPrint(sg, {maxDepth: 2})` — the docs demo the formatting API by
using it.

**Dataset preview cards.** Where each dataset is introduced, an empty
marker element (`<div class="dataset" data-name="…">`) is populated by
livecells.js with the name, `N rows × M cols`, a download link, and an
expandable preview of the first rows (HTML table — site furniture, like
the download link, not cell output).

Cell scope: every export of `supergroup`, `supergroup/dag`,
`/sequence`, `/compare`, `/adapters`, `/formatting`, plus `d3` and the
datasets. Everything in scope is also pre-assigned to `window`.

### Library additions (driven by the no-magic display rule)

New subpath module `supergroup/formatting`: explicit formatting
functions. Every function returns a **string**, so what the site
displays is exactly what a reader gets in their own console (no DOM in
the library).

- `prettyPrint(x, opts)` — `x`: collection | node | node array.
  Indented tree, one line per node (default: label + record count +
  `cmp` annotation when present). No summary header. `opts = {maxDepth,
  maxChildren, fmt, rails}`: `fmt(n) => string` replaces the per-node
  line; `rails: true` uses `├─`-style box-drawing instead of plain
  indentation.
- `summary(x)` — the shape line, kept separate from `prettyPrint`:
  `110 roots · 2,816 nodes · 8,618 records`.
- `toTable(records, {maxRows, columns})` — aligned monospace text table
  for arrays of plain records.
- **Truncation only on request**: `maxDepth`/`maxChildren`/`maxRows`
  have no defaults — output is complete unless an option is passed, and
  applied truncation is always explicit in the output (`… 105 more`),
  never silent.

Core addition: `SGNode.dimPath(sep = '/')` — pedigree mapped over
`.dim`, joined (v1 parity). The rest of v1's viewing conveniences were
inventoried against v2 and resolved without new API: `lookup` →
`node()`, `lookupMany` → `select()`, `flattenTree` → `flatten()` (DFS
pre-order, each node once), `leafNodes` → `leaves()`, `namePaths`/
`aggregates` → plain array ops over `nodes` (the migration page
documents these mappings); `addRecordsAsChildrenToLeafNodes` is
deliberately deferred to the examples round.

These are src changes: implement + test, then rebuild the dist and
re-run `build:site` so the vendored copy carries them before the site
cells use them.

### Content outline

Material is mined from three sources: the old README (v1 walkthrough), the
gh-pages `doc.md` (live-render hospital-data walkthrough), and the Toptal
article
(<https://www.toptal.com/developers/javascript/ultimate-in-memory-data-collection-manipulation-with-supergroup-js>).

**Voice**: neutral, close to the old README's register. The gh-pages doc and
the Toptal article run to excessive familiarity and enthusiasm — take
neither their tone nor their material wholesale. Selectively: propose what
seems worth bringing in (examples, motivating problems, comparisons to
d3.nest etc.) and review the candidates with SG rather than grabbing
everything.

1. **Positioning** — the seam between `d3.group` (grouping, no navigation)
   and `d3.hierarchy` (navigation, no records, no multi-parent).
2. **Quick start + core walkthrough** — Olympic athletes: records at every
   level, navigation, paths, aggregates, multi-valued dims, Date keys.
3. **DAG module** — constructors (`fromParentIds`/`fromEdges`/
   `fromParentChild`), cycle handling, union-safe rollups, subgraph;
   culminating in a live embedded dag-browser-widget fed by
   `toDagBrowserNodes` (fallback per above).
4. **Sequence** — deliberately small: `groupBySequence` on hurricane events
   (from lifeflow's sample data), forward/backward/anchored-both as
   structure output, plus one stock d3 icicle via `toD3` + `d3.partition`.
   A visible placeholder notes that the full lifeflow/timelines demo joins
   the page when that project revives.
5. **Compare** — two value sets over one hierarchy, vs-hub style;
   `diffExample.csv` may seed this.
6. **Migration** — the v1 → v2 table from the spec.

### Datasets (`docs/data/`)

| Dataset | Source | Used by |
|---|---|---|
| `OlympicAthletes.csv` | moves from `examples/` | core walkthrough |
| `fake-patient_data.csv` | gh-pages branch `examples/` | grouping/aggregate examples (the doc.md walkthrough) |
| `diffExample.csv` | gh-pages branch `examples/` | compare intro |
| FIPS state/county data | Census fallback (Toptal article's dataset is a dead gist) | scale example (optional) |
| hurricane events | lifeflow `sampleData/` | sequence intro |
| small containment digraph | hand-written (dmvd-shaped, cyclic) | DAG constructors intro |
| `synthea-conditions.csv`, `synthea-drugs.csv`, `synthea-persons.csv` | synthea1k (public S3 `s3://synthea-omop/synthea1k/`, ~1,130 patients), names joined from SG's local OMOP vocab (postgres `n3c.n3c`) | clinical sequence demo; cohort compare; grouping |
| `drug-classes.json` | ATC+RxNorm ancestry (direct edges) over the cohort's 104 drugs, from `n3c.concept_ancestor` — ~1,284 nodes, ~3,081 edges, 80 multi-parent | DAG centerpiece: attachRecords, drc-style rollups, DBW embed, compare by id |

The synthea/vocab extracts are rebuilt by a committed curation script
(`docs/data/curation/`) so they can scale up later for the lifeflow/
timelines demo. SG OK'd publishing SNOMED/ATC/RxNorm names in these
extracts (2026-07-14).

## README rewrite

Lean (~120 lines), keeping the current README's neutral register: positioning
paragraph, install + quick-start snippet, short feature tour (one small
snippet per module), link to the live demo site, the v1 → v2 migration
table, dev notes (test/typecheck/build/publish). The long walkthrough moves
to the site; the README stops trying to be the documentation.

## `legacy/` move

Move to `legacy/`: `supergroup.js`, `oldDemoStuff/`, `oldTests/`,
`old_doc.html`, `old_groc.index.html`, `bower.json`, root `assets/`,
`test/supergroup_vows.js`, `test/tree_test_data.csv`. Add a one-paragraph
`legacy/README.md` pointing at NOTES.md for the archaeology.
`examples/OlympicAthletes.csv` moves to `docs/data/` (then `examples/` is
empty and goes away). Nothing in `legacy/` ships to npm.

## Packaging

`package.json`:

- `version: "2.0.0"`, `type: "module"`
- `exports` map for `.`, `./dag`, `./sequence`, `./compare`, `./adapters`,
  each with `types` + `import` (or `default`) pointing into `dist/`; no
  `main`
- `files: ["dist"]`
- drop `lodash` (runtime deps: none); drop dead devDeps (vows, jasmine,
  xhr2)
- `engines.node: ">=18"`
- scripts: `build` (tsc -p tsconfig.build.json), `build:site`,
  `prepublishOnly` (build + test + typecheck); `test` becomes `vitest run`
  (retire the vows `test`/`debug` scripts)
- refreshed description/keywords for v2

Plus: `tsconfig.build.json` emitting ESM + `.d.ts` to `dist/`; add the
missing LICENSE file (MIT, matching package.json).

**Verification**: `npm pack`, install the tarball into a scratch project,
import every subpath, run a smoke snippet.

## Deferred minors (publish gate, from the M1 plan)

- id collision: numeric `1` vs string `'1'` under one dim — disambiguate or
  document.
- Document record dedup as reference-identity (`Set<R>`).
- Extract shared BFS/queue helper (O(n²) `queue.shift()` in build.ts,
  metrics.ts, subgraph.ts; duplicated min-depth BFS).
- Document `pct()` semantics on dag collections.
- `subgraph` clones keep `synthetic` flag and collection `root`.
- Re-export `SGNodeLike` from the core index.
- Document `fromParentChild` last-write-wins label conflicts.
- Add empty-input tests, type-level inference tests, and an end-to-end
  `toDagBrowserNodes(subgraph(...))` test.

## Order of work

1. Deferred minors (touch src; the site should demo final behavior).
2. Packaging + dist build (the site vendors dist, so it must exist first).
3. Site, then README, then `legacy/` move, then planning-doc cleanup.
4. Flip the Pages setting (Settings → Pages → master `/docs`) — SG does it,
   or via `gh api` with SG's OK. Verify the live site.
5. `npm publish` — everything prepped; SG runs it (auth/2FA) or gives
   explicit go-ahead to run it here. Confirm 2.0.0 is `latest`.
6. Post-publish: dmvd CLAUDE.md pointer to the v2 spec's GitHub URL; note in
   hub's `projects/lifeflow/README.md` about the supergroup update and the
   reminder to add lifeflow/timelines to the demo page when ready.

## Non-goals

- Full lifeflow/timelines demo rewrite (separate later project; the site
  carries a placeholder).
- Fixing/publishing the 1.x line.
- CI / GitHub Actions of any kind.
- Framework adapters, docs search, multi-page docs site.
