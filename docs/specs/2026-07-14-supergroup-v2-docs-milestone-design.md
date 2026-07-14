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

Each example is an editable cell (CodeMirror 6 from CDN) with a Run button;
the result renders below the cell. Cell code is evaluated as an async
function body receiving the library modules (`supergroup`, `dag`,
`sequence`, `compare`, `adapters`), `d3`, and the datasets in scope.
Results render through an SGNode-aware pretty-printer (label/path/counts);
returned DOM/SVG nodes pass through untouched (for the d3 examples).
Everything in cell scope is also exposed on `window` so devtools serve as
the escape hatch beyond the cells.

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
