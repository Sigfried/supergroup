# DuckDB Demo Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors run SQL (duckdb-wasm, in-browser, serverless) in live
cells and feed results into supergroup; the flagship example derives the
ATC/RxNorm hierarchy live from OMOP vocabulary parquet and browses it with
per-node record + distinct-patient counts.

**Architecture:** A new `omop-demo-data` repo publishes static parquet
(vocab cut + all ten synthea1k tables) via GitHub Pages. On the demo page,
`docs/duckdb.js` initializes duckdb-wasm in the background after first
paint, registers remote parquet views + local CSV tables, and exports a
`sql()` global returning plain row objects. `docs/livecells.js` gains an
await-before-publish runner change and a SQL cell flavor. The library
gains `rollup({ distinct })`.

**Tech Stack:** duckdb-wasm (jsdelivr CDN), parquet (zstd), CodeMirror
`@codemirror/lang-sql` (esm.sh), psql + duckdb CLI for extraction,
vitest + tsc for the library, headless Chrome for page verification.

**Spec:** `planning/specs/2026-07-14-duckdb-demo-design.md` — read it first.

## Global Constraints

- Serverless: static files only; no query server, no build service.
- Data repo path (local): `~/github-repos/personal/omop-demo-data`;
  published base URL `https://sigfried.github.io/omop-demo-data`.
- Vocab cut: ALL of `vocabulary_id IN ('ATC','RxNorm')` plus
  `vocabulary_id = 'SNOMED' AND domain_id = 'Condition'`; edges are
  `concept_ancestor` rows at `min_levels_of_separation = 1` with BOTH
  endpoints in the cut. No demo-drug closure filtering.
- Synthea: all ten tables, all columns, `concept_id = 0` sentinel rows
  KEPT.
- `sql()` returns plain JS row objects: BigInt → Number (throw above
  `Number.MAX_SAFE_INTEGER`), Arrow Date/Timestamp → JS `Date`.
- Cells: no autorun; no const/return in eval cells; bare assignments
  publish to window; DOM passes through the renderer; no library-aware
  display magic. SQL cells never touch eval.
- ES modules, destructured imports, no `any`.
- Commit after each green step; never push without SG's permission.
- OMOP vocabulary source: local postgres, db `n3c`, schema `n3c`
  (`psql -X -d n3c`). `psql` and `curl` are allowlisted.
- Site vendor dir `docs/vendor/supergroup` is BUILT (`npm run
  build:site`) — never edit it by hand.
- Markdown committed to files wraps at ~80 columns.

## Local dev servers (used by several verification steps)

Two static servers (python's `http.server` does NOT serve HTTP Range
requests, which duckdb-wasm needs — use it only for the site, never for
the data):

```bash
# site (terminal 1, from the supergroup repo root)
npm run site:serve                              # :8123
# data repo with Range + CORS support (terminal 2)
npx http-server ~/github-repos/personal/omop-demo-data -p 8124 --cors -s
```

The page reads the data base URL from `?data=`; local runs use
`http://localhost:8123/?data=http://localhost:8124`.

Headless Chrome check command (network access required — CDN + data):

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu --virtual-time-budget=60000 \
  --dump-dom "http://localhost:8123/?runall&data=http://localhost:8124"
```

---

### Task 1: omop-demo-data repo — extraction script + parquet + README

**Files:**
- Create: `~/github-repos/personal/omop-demo-data/build/extract.sh`
- Create: `~/github-repos/personal/omop-demo-data/README.md`
- Create (generated): `vocab/concept.parquet`, `vocab/concept_edge.parquet`,
  `synthea1k/<table>.parquet` × 10
- Create: `~/github-repos/personal/omop-demo-data/.gitattributes`

**Interfaces:**
- Produces (later tasks rely on these exact names/columns):
  - `vocab/concept.parquet`: `concept_id, concept_name, vocabulary_id,
    concept_class_id, standard_concept, concept_code, domain_id`
  - `vocab/concept_edge.parquet`: `parent_id, child_id`
  - `synthea1k/{person, observation_period, visit_occurrence,
    condition_occurrence, drug_exposure, procedure_occurrence,
    measurement, observation, condition_era, drug_era}.parquet` — full
    CDM columns as in the source CSVs.

- [ ] **Step 1: Create the repo skeleton**

```bash
mkdir -p ~/github-repos/personal/omop-demo-data/build
cd ~/github-repos/personal/omop-demo-data && git init
printf '*.parquet -diff\n' > .gitattributes
```

- [ ] **Step 2: Write `build/extract.sh`**

```sh
#!/bin/sh
# Regenerate every parquet artifact in this repo.
# Requires: curl, duckdb, psql with an OMOP vocabulary at db n3c, schema n3c.
# Synthea source: public S3 bucket, no credentials.
set -e
cd "$(dirname "$0")/.."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p synthea1k vocab

base=https://synthea-omop.s3.amazonaws.com/synthea1k
tables="person observation_period visit_occurrence condition_occurrence \
drug_exposure procedure_occurrence measurement observation \
condition_era drug_era"
for t in $tables; do
  echo "synthea1k/$t"
  curl -sfS "$base/$t.csv" -o "$work/$t.csv"
  duckdb -c "COPY (FROM read_csv_auto('$work/$t.csv', sample_size=-1))
    TO 'synthea1k/$t.parquet' (FORMAT parquet, COMPRESSION zstd);"
done

echo "vocab extract"
psql -X -d n3c -At <<SQL
\\set ON_ERROR_STOP on
create temp table cut as
  select concept_id from n3c.concept
  where vocabulary_id in ('ATC','RxNorm')
     or (vocabulary_id = 'SNOMED' and domain_id = 'Condition');
\\copy (select c.concept_id, c.concept_name, c.vocabulary_id, c.concept_class_id, c.standard_concept, c.concept_code, c.domain_id from n3c.concept c join cut on cut.concept_id = c.concept_id order by c.concept_id) to '$work/concept.csv' with (format csv, header)
\\copy (select ca.ancestor_concept_id as parent_id, ca.descendant_concept_id as child_id from n3c.concept_ancestor ca join cut p on p.concept_id = ca.ancestor_concept_id join cut ch on ch.concept_id = ca.descendant_concept_id where ca.min_levels_of_separation = 1 order by 1, 2) to '$work/concept_edge.csv' with (format csv, header)
SQL

duckdb -c "
COPY (FROM read_csv_auto('$work/concept.csv', sample_size=-1))
  TO 'vocab/concept.parquet' (FORMAT parquet, COMPRESSION zstd);
COPY (FROM read_csv_auto('$work/concept_edge.csv', sample_size=-1))
  TO 'vocab/concept_edge.parquet' (FORMAT parquet, COMPRESSION zstd);
"

# Row-count assertions: parquet must match the source exactly.
pg_c=$(psql -X -d n3c -At -c "select count(*) from n3c.concept
  where vocabulary_id in ('ATC','RxNorm')
     or (vocabulary_id = 'SNOMED' and domain_id = 'Condition')")
pq_c=$(duckdb -csv -noheader -c "select count(*) from 'vocab/concept.parquet'")
[ "$pg_c" = "$pq_c" ] || { echo "concept mismatch: pg=$pg_c pq=$pq_c"; exit 1; }
for t in $tables; do
  src=$(($(wc -l < "$work/$t.csv") - 1))
  pq=$(duckdb -csv -noheader -c "select count(*) from 'synthea1k/$t.parquet'")
  [ "$src" = "$pq" ] || { echo "$t mismatch: csv=$src pq=$pq"; exit 1; }
done
echo "done; counts verified"
duckdb -c "select vocabulary_id, domain_id, count(*) n
  from 'vocab/concept.parquet' group by all order by n desc;"
```

Then: `chmod +x build/extract.sh`

- [ ] **Step 3: Run it and record the numbers**

```bash
cd ~/github-repos/personal/omop-demo-data && ./build/extract.sh
```

Expected: each table name printed, `done; counts verified`, then a
vocab breakdown table (ATC ≈ 7.2k, RxNorm ≈ 313k, SNOMED/Condition ≈
160k — record the actual numbers for the README and Task 5's
expectations). Check total size: `du -sh vocab synthea1k` — expect
roughly 30–50MB combined. If any single file exceeds 95MB, STOP and
report (GitHub hard limit is 100MB).

- [ ] **Step 4: Fetch the vocabulary version for the README**

```bash
psql -X -d n3c -At -c \
  "select vocabulary_version from n3c.vocabulary where vocabulary_id = 'None'"
```

- [ ] **Step 5: Write `README.md`**

Contents (fill the bracketed values from Steps 3–4; keep the citation
sentence verbatim — it is required wording):

```markdown
# omop-demo-data

Static parquet extracts for browser demos (supergroup live docs, vs-hub,
future projects). Served via GitHub Pages; readable by duckdb-wasm over
HTTP range requests. Regenerate with `build/extract.sh` (requires curl,
duckdb, and psql with an OMOP vocabulary at db `n3c`, schema `n3c`).

## synthea1k/

All ten tables of a 1,000-patient synthetic OMOP CDM dataset, all
columns, converted CSV → parquet unmodified. Synthea synthetic patient
generator data in OMOP Common Data Model was accessed on 2026-07-14 from
https://registry.opendata.aws/synthea-omop.

Note: `drug_exposure.drug_concept_id` and some `condition_occurrence`
rows carry the `concept_id = 0` ("No matching concept") sentinel, with
the real code in the `*_source_concept_id` column. Rows are kept as-is —
that is what real OMOP data looks like. The `*_era` tables are computed
on standard (RxNorm ingredient / SNOMED) concepts and are the clean
choice for concept-level work.

## vocab/

OMOP vocabulary cut: all ATC and RxNorm concepts plus SNOMED
condition-domain concepts ([N] rows), and their direct hierarchy edges
(`concept_ancestor` at `min_levels_of_separation = 1`, both endpoints in
the cut; [M] rows).

- `concept.parquet`: concept_id, concept_name, vocabulary_id,
  concept_class_id, standard_concept, concept_code, domain_id
- `concept_edge.parquet`: parent_id, child_id

Vocabulary snapshot: [vocabulary_version from Step 4], extracted
2026-07-14.

Licensing: RxNorm and ATC are freely redistributable; SNOMED CT content
is redistributed here as part of an OMOP vocabulary release for
demonstration purposes. (SNOMED/ATC/RxNorm publishing approved for this
project's demos.)
```

- [ ] **Step 6: Commit**

```bash
cd ~/github-repos/personal/omop-demo-data
git add -A && git commit -m "parquet extracts: synthea1k (10 tables) + ATC/RxNorm/SNOMED-condition vocab cut"
```

Do NOT create the GitHub repo or push yet — that needs SG's go-ahead and
happens in Task 6. Everything until then uses the local checkout via
`?data=http://localhost:8124`.

---

### Task 2: `rollup({ distinct })` in the library

**Files:**
- Modify: `src/node.ts:125-129` (rollup) and the `Agg`-adjacent types
- Test: `test/agg.test.ts`, `test/dag-records.test.ts`

**Interfaces:**
- Consumes: existing `recordsUnder` (`src/selection.ts:21`),
  `aggregate` (`src/node.ts:136`).
- Produces:
  `rollup(arg?: ((r: R) => number) | RollupOpts<R>): { count: number; distinct?: number } & Partial<Agg>`
  where `RollupOpts<R> = { value?: (r: R) => number; distinct?: (r: R) => unknown }`.
  Call shapes: `rollup()` → `{count}`; `rollup(fn)` → full `Agg`
  (unchanged); `rollup({ distinct: fn })` → `{count, distinct}`;
  `rollup({ value: fn, distinct: fn })` → `Agg & {distinct}`.
  `distinct` = number of unique key values over the deduped
  union-of-node-and-descendants record set (union first, then distinct —
  never sum-over-paths).

- [ ] **Step 1: Write the failing tests**

In `test/agg.test.ts`, add to the existing describe block (fixture `RXS`
already gives `rx` 3 records with costs 2, 10, 50):

```ts
  it('rollup distinct counts unique key values over the union', () => {
    expect(rx.rollup({ distinct: r => r.cost })).toEqual({ count: 3, distinct: 3 })
    expect(rx.rollup({ value: r => r.cost, distinct: r => r.cost }))
      .toEqual({ count: 3, sum: 62, mean: 62 / 3, min: 2, max: 50, distinct: 3 })
  })
```

In `test/dag-records.test.ts`, add to the existing describe block (it
already has the `DIAMOND` fixture — A→B, A→C, B→D, C→D — and a `Pt`
record type; extend `Pt` with `person: string`, adding `person` to the
records in the existing tests is NOT needed if you set it only here):

```ts
  it('rollup distinct dedups across multi-parent paths', () => {
    const sg = fromParentIds<Pt & { person: string }>(DIAMOND)
    attachRecords(sg, [
      { concept: 'D', n: 10, person: 'p1' },   // reachable via B AND via C
      { concept: 'B', n: 5, person: 'p1' },    // same person again
      { concept: 'C', n: 2, person: 'p2' },
    ], r => r.concept)
    const a = sg.select(['A'])[0]!
    // 3 records under A (D's counted once), but only 2 unique persons
    expect(a.rollup({ distinct: r => r.person })).toEqual({ count: 3, distinct: 2 })
  })

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run test/agg.test.ts test/dag-records.test.ts`
Expected: the new tests FAIL (rollup ignores the object argument —
`{ count: n }` without `distinct`); all pre-existing tests PASS.

- [ ] **Step 3: Implement**

In `src/node.ts`, add above the class:

```ts
export interface RollupOpts<R> {
  value?: (r: R) => number
  distinct?: (r: R) => unknown
}
```

Replace the `rollup` method (keep the doc comment, extend it):

```ts
  /**
   * union-then-aggregate over this node and all descendants; never
   * sum-over-paths. `distinct` counts unique key values over the same
   * deduped union.
   */
  rollup(arg?: ((r: R) => number) | RollupOpts<R>): { count: number; distinct?: number } & Partial<Agg> {
    const recs = recordsUnder([this])
    const opts = typeof arg === 'function' ? { value: arg } : arg ?? {}
    const out: { count: number; distinct?: number } & Partial<Agg> =
      opts.value ? aggregate(recs, opts.value) : { count: recs.length }
    if (opts.distinct) out.distinct = new Set(recs.map(opts.distinct)).size
    return out
  }
```

Export `RollupOpts` from `src/index.ts` alongside the other node types.

- [ ] **Step 4: Run tests + typecheck, verify green**

Run: `npx vitest run test/agg.test.ts test/dag-records.test.ts && npm run typecheck`
Expected: PASS, tsc exit 0.

- [ ] **Step 5: Rebuild the site vendor copy**

Run: `npm run build:site`
Expected: `docs/vendor/supergroup/node.js` now contains the new rollup;
`git status` shows vendor changes.

- [ ] **Step 6: Commit**

```bash
git add src/node.ts src/index.ts test/agg.test.ts test/dag-records.test.ts docs/vendor
git commit -m "feat: rollup({ value, distinct }) — distinct-key counts over union"
```

---

### Task 3: `docs/duckdb.js` runtime + page wiring

**Files:**
- Create: `docs/duckdb.js`
- Modify: `docs/index.html` (importmap lines 9–25; status line near the
  Run-all button, line 34)
- Modify: `docs/livecells.js` (loader lines 11–22, scope line 24)

**Interfaces:**
- Consumes: Task 1 parquet layout (names/paths listed there).
- Produces:
  - `initDuckdb(localCsvText: Record<string, string>): Promise<void>` —
    idempotent; kicks off init; sets `#duckdb-status` text.
  - `sql(text: string): Promise<object[]>` — plain row objects (BigInt →
    Number, Date/Timestamp → JS Date); awaits init internally; queries
    run serialized on one connection.
  - View/table names visible in SQL: remote `concept, concept_edge,
    person, observation_period, visit_occurrence, condition_occurrence,
    drug_exposure, procedure_occurrence, measurement, observation,
    condition_era, drug_era`; local `athletes, patients, budgets,
    hurricanes, fips, conditions, drugs, persons`.
  - `sql` is in cell scope and on `window`.

- [ ] **Step 1: Add importmap entry + status line to `docs/index.html`**

In the importmap, after the `dag-browser-widget` line (add a comma to
that line):

```json
    "@duckdb/duckdb-wasm": "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm"
```

After the Run-all button paragraph (line 34):

```html
<p id="duckdb-status">duckdb: not started</p>
```

- [ ] **Step 2: Write `docs/duckdb.js`**

```js
import * as duckdb from '@duckdb/duckdb-wasm'

// Static parquet host (see planning/specs/2026-07-14-duckdb-demo-design.md).
// Local dev: ?data=http://localhost:8124 (npx http-server on the data repo;
// python http.server won't do — no Range support).
const DATA_BASE = new URLSearchParams(location.search).get('data')
  ?? 'https://sigfried.github.io/omop-demo-data'

const REMOTE = {
  concept: 'vocab/concept.parquet',
  concept_edge: 'vocab/concept_edge.parquet',
  person: 'synthea1k/person.parquet',
  observation_period: 'synthea1k/observation_period.parquet',
  visit_occurrence: 'synthea1k/visit_occurrence.parquet',
  condition_occurrence: 'synthea1k/condition_occurrence.parquet',
  drug_exposure: 'synthea1k/drug_exposure.parquet',
  procedure_occurrence: 'synthea1k/procedure_occurrence.parquet',
  measurement: 'synthea1k/measurement.parquet',
  observation: 'synthea1k/observation.parquet',
  condition_era: 'synthea1k/condition_era.parquet',
  drug_era: 'synthea1k/drug_era.parquet',
}

const setStatus = (t) => {
  const el = document.querySelector('#duckdb-status')
  if (el) el.textContent = `duckdb: ${t}`
}

let conn
async function init(localCsvText) {
  setStatus('loading…')
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }))
  const db = new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), new Worker(workerUrl))
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)
  conn = await db.connect()
  for (const [name, path] of Object.entries(REMOTE))
    await conn.query(`CREATE VIEW ${name} AS SELECT * FROM read_parquet('${DATA_BASE}/${path}')`)
  for (const [name, text] of Object.entries(localCsvText)) {
    // athletes CSV has bare-\r line endings, which read_csv rejects
    await db.registerFileText(`${name}.csv`, text.replace(/\r(?!\n)/g, '\n'))
    await conn.query(`CREATE TABLE ${name} AS SELECT * FROM read_csv_auto('${name}.csv')`)
  }
  setStatus(`ready (${Object.keys(REMOTE).length + Object.keys(localCsvText).length} tables)`)
}

let ready
export function initDuckdb(localCsvText) {
  ready ??= init(localCsvText).catch((e) => {
    setStatus(`failed: ${e?.message ?? e}`)
    throw e
  })
  return ready
}

// Arrow Type enum ids that unwrap to JS Dates (Date = 8, Timestamp = 10).
const DATEISH = new Set([8, 10])

function unwrap(v, typeId, name) {
  if (v == null) return v
  if (typeof v === 'bigint') {
    if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < -BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`column ${name}: BigInt ${v} exceeds Number.MAX_SAFE_INTEGER`)
    return Number(v)
  }
  if (DATEISH.has(typeId)) return new Date(Number(v))
  return v
}

let queue = Promise.resolve()
export function sql(text) {
  const run = queue.catch(() => {}).then(async () => {
    if (!ready) throw new Error('duckdb is not initialized yet')
    await ready
    const result = await conn.query(String(text))
    const fields = result.schema.fields.map((f) => [f.name, f.type.typeId])
    return result.toArray().map((row) => {
      const o = row.toJSON()
      for (const [name, typeId] of fields) o[name] = unwrap(o[name], typeId, name)
      return o
    })
  })
  queue = run
  return run
}
```

- [ ] **Step 3: Wire it into `docs/livecells.js`**

Replace lines 11–24 (the loaders, `files`, `data`, `scope`) with:

```js
import { initDuckdb, sql } from './duckdb.js'

const rawCsv = {}
const csv = async (name) => {
  const text = await (await fetch(`data/${name}`)).text()
  rawCsv[name] = text
  return d3.csvParse(text, d3.autoType)
}
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

// fire-and-forget: the page never blocks on duckdb; sql() awaits readiness
initDuckdb(Object.fromEntries(Object.entries(files)
  .filter(([, f]) => f.endsWith('.csv')).map(([k, f]) => [k, rawCsv[f]])))

const scope = { ...core, ...dagMod, ...seqMod, ...cmpMod, ...adapters, ...fmtMod, d3, sql, ...data }
```

(`drugClasses` stays in `files` until Task 5 retires it.)

- [ ] **Step 4: Syntax + typecheck**

Run: `node --input-type=module --check < docs/duckdb.js && node --input-type=module --check < docs/livecells.js && npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Verify in headless Chrome**

Start both dev servers (see "Local dev servers"), then run the headless
command. Expected in the DOM dump:

- `duckdb: ready (20 tables)` (12 remote + 8 local)
- zero occurrences of `cell-error`
- `sg-leaf` count unchanged from the pre-task baseline (run once before
  starting the task to capture it)

If the status is `failed: …`, the message names the culprit (CDN vs
data URL). Do not proceed on a failed status.

- [ ] **Step 6: Commit**

```bash
git add docs/duckdb.js docs/index.html docs/livecells.js
git commit -m "docs site: duckdb-wasm runtime — remote parquet views, local CSV tables, sql() global"
```

---

### Task 4: runner await-before-publish + SQL cell flavor + first SQL cells

**Files:**
- Modify: `docs/livecells.js` (runCell ~lines 70–103; cell construction
  ~lines 113–144; htmlTable stays where it is but gains a caller)
- Modify: `docs/index.html` (importmap; new page section)

**Interfaces:**
- Consumes: `sql()` from Task 3.
- Produces:
  - Eval cells: any published name whose value is thenable is resolved
    before it lands on window/ledger (so `rows = sql(\`…\`)` publishes
    rows, not a promise).
  - SQL cells: `<pre class="cell sql" data-name="NAME">QUERY</pre>` —
    Run executes the query via `sql()`, renders a capped table
    ("showing first 50 of N rows" when N > 50), publishes rows as
    `window.NAME` with the same ownership/Clear semantics as eval-cell
    publishes. Without `data-name`: display-only.
  - Page publishes `vocabCounts` (used by the next cell and available
    for console exploration).

- [ ] **Step 1: Add the SQL CodeMirror language to the importmap**

In `docs/index.html` importmap:

```json
    "@codemirror/lang-sql": "https://esm.sh/@codemirror/lang-sql@6",
```

- [ ] **Step 2: livecells.js — imports and await-before-publish**

Add to the CodeMirror imports:

```js
import { sql as sqlLang } from '@codemirror/lang-sql'
```

In `runCell`, replace the body of the `try` block up to (not including)
the ownership loop with:

```js
    let result
    if (cell.isSql) {
      result = await sql(view.state.doc.toString())
      if (cell.dataName) window[cell.dataName] = result
    } else {
      result = await evalCell(view.state.doc.toString())
    }
    const names = Object.keys(window).filter((k) => !before.has(k))
    for (const [k, v] of prior) if (window[k] !== v) names.push(k)
    // resolve published thenables: `rows = sql(…)` publishes rows, not a
    // promise (await is unavailable in eval'd cell code)
    for (const k of names)
      if (window[k] && typeof window[k].then === 'function') window[k] = await window[k]
    render(cell.isSql ? sqlResult(result) : result, out)
```

(The ownership loop and the rest of the function are unchanged; `render`
moves after the resolve loop so a rejected publish lands in the catch
before anything is drawn.)

- [ ] **Step 3: livecells.js — SQL result rendering + cell construction**

Add near `htmlTable` (which is unchanged):

```js
const SQL_PREVIEW_ROWS = 50
function sqlResult(rows) {
  const div = document.createElement('div')
  if (!rows.length) { div.textContent = '0 rows'; return div }
  const cols = Object.keys(rows[0])
  div.append(htmlTable(rows.slice(0, SQL_PREVIEW_ROWS), cols))
  const note = document.createElement('div')
  note.className = 'cell-placeholder'
  note.textContent = rows.length > SQL_PREVIEW_ROWS
    ? `showing first ${SQL_PREVIEW_ROWS} of ${rows.length.toLocaleString('en-US')} rows`
    : `${rows.length.toLocaleString('en-US')} rows`
  div.append(note)
  return div
}
```

In the cell-construction loop, derive the flavor and pick the language:

```js
  const isSql = pre.classList.contains('sql')
  const dataName = pre.dataset.name
  ...
  const view = new EditorView({ doc: code, parent: editorHost,
    extensions: [basicSetup, isSql ? sqlLang() : javascript()] })
  const cell = { view, out, status, btn, pub, published: new Set(), isSql, dataName }
```

Note `htmlTable` is defined below the cells loop today — move
`htmlTable` (and `sqlResult`) ABOVE `runCell` so both cell flavors and
the dataset cards share one table renderer.

- [ ] **Step 4: Add the DuckDB page section to `docs/index.html`**

Insert after the `d3.group` comparison cell (after line 176, before the
`<h2>DAG module` heading):

```html
<h2>SQL on the page: DuckDB</h2>
<p>The page runs <a
href="https://duckdb.org/docs/api/wasm/overview">duckdb-wasm</a> — a full
SQL engine in the browser, no server. Remote parquet (an OMOP vocabulary
cut and a 1,000-patient synthetic OMOP dataset, read over HTTP range
requests) is registered as views; the CSV datasets above are registered
as tables. SQL cells run through <code>sql()</code>, which is also in
cell scope and on <code>window</code>. A cell's published names are
resolved before they land on <code>window</code> — so a name assigned
from <code>sql(…)</code> in one cell holds plain rows by the time the
next cell (or the console) reads it. Within a single cell, a
<code>sql(…)</code> value is still a promise — chain with
<code>.then(…)</code> or use it as the cell's last statement.</p>

<pre class="cell sql" data-name="vocabCounts">
SELECT vocabulary_id, domain_id, count(*) AS concepts
FROM concept GROUP BY ALL ORDER BY concepts DESC
</pre>

<p>Published SQL results are plain records — everything on this page
composes with them:</p>

<pre class="cell">
// vocabCounts was published by the SQL cell above
toTable(vocabCounts)
</pre>
```

- [ ] **Step 5: Verify**

`node --input-type=module --check < docs/livecells.js`, then the
headless Chrome command (both servers running). Expected:

- `duckdb: ready (20 tables)`
- The vocabCounts table appears (grep the dump for `vocabulary_id` and
  for `RxNorm`), with ATC/RxNorm/SNOMED rows.
- zero `cell-error`
- Date sanity (guards the Arrow date-unit assumption): in a browser (or
  via a temporary headless check), run
  `sql('SELECT drug_era_start_date FROM drug_era LIMIT 1')` and confirm
  the value is a `Date` in a plausible year (1940–2026). If it lands
  near 1970, the Arrow date unit is days, not millis — change the
  `DATEISH` branch of `unwrap` to
  `new Date(Number(v) * (typeId === 8 ? 86400000 : 1))` and note which
  branch reality picked in the task report.

- [ ] **Step 6: Commit**

```bash
git add docs/livecells.js docs/index.html
git commit -m "docs site: SQL cell flavor + await-before-publish; duckdb intro cells"
```

---

### Task 5: flagship ATC example; retire drug-classes.json

**Files:**
- Modify: `docs/index.html` (replace the "Real classification data"
  section — lines 242–296 BEFORE Task 4's insertion shifted numbering,
  so locate by heading; rewrite the compare cohort cell — the one using
  `drugClasses` under the Compare h2; drop the drugClasses `<li>` + card
  from the data list)
- Modify: `docs/livecells.js` (drop `drugClasses` from `files`)
- Delete: `docs/data/drug-classes.json`, `docs/data/curation/`

**Interfaces:**
- Consumes: `sql()`, SQL cells + published-name resolution (Tasks 3–4),
  `rollup({ distinct })` (Task 2), `fromParentChild` (labels come from
  the child column, so roots are labeled via NULL-parent rows — that is
  why the query emits them).
- Produces: page-published names `classEdges`, `drugEras`, `womenEras`
  (used across the flagship cells and by visitors in the console).

- [ ] **Step 1: Replace the "Real classification data" section**

New content for `docs/index.html` lines 242–296:

```html
<h3>Real classification data: ATC + RxNorm, derived live</h3>
<p>No prepared hierarchy file: the cell below walks the OMOP vocabulary's
direct-edge table upward from the drug concepts this cohort actually
used — a recursive query over 320k+ concepts, in the browser. The
NULL-parent rows carry each node's name (roots included);
<code>fromParentChild</code> consumes the edge rows directly.</p>

<pre class="cell sql" data-name="classEdges">
WITH RECURSIVE up AS (
  SELECT DISTINCT drug_concept_id AS concept_id FROM drug_era
  UNION
  SELECT e.parent_id FROM concept_edge e JOIN up ON e.child_id = up.concept_id
)
SELECT NULL AS parent_id, u.concept_id AS child_id, c.concept_name
FROM up u JOIN concept c ON c.concept_id = u.concept_id
UNION ALL
SELECT e.parent_id, e.child_id, c.concept_name
FROM concept_edge e
JOIN up p ON p.concept_id = e.parent_id
JOIN up ch ON ch.concept_id = e.child_id
JOIN concept c ON c.concept_id = e.child_id
</pre>

<pre class="cell sql" data-name="drugEras">
SELECT person_id, drug_concept_id, drug_era_start_date,
       drug_era_end_date, drug_exposure_count
FROM drug_era
</pre>

<p>SQL did the joins and the traversal; supergroup does what SQL can't
express cleanly — union-then-aggregate rollups over a multi-parent DAG,
where a record reachable by several paths counts once:</p>

<pre class="cell">
// edges → DAG; attach drug records by concept id; count per node
atc = fromParentChild(classEdges, { parent: 'parent_id', child: 'child_id', label: 'concept_name' })
attach = attachRecords(atc, drugEras, r => String(r.drug_concept_id))
for (const n of atc.nodes) {
  ru = n.rollup({ distinct: r => r.person_id })
  n.label = `${n.label} — ${ru.distinct} pts · ${ru.count} rx`
}
;(async () => {
  const { createElement } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { DagBrowser } = await import('dag-browser-widget')
  const div = document.createElement('div')
  div.append(`${attach.matched} of ${drugEras.length} drug records attached; `
    + `${atc.nodes.length} nodes, ${atc.roots.length} roots`)
  const inner = document.createElement('div')
  inner.style.height = '360px'
  inner.style.overflow = 'auto'
  createRoot(inner).render(createElement(DagBrowser,
    { nodes: toDagBrowserNodes(atc), levelsExpanded: 1 }))
  div.append(inner)
  return div
})()
</pre>

<p>Change who is being counted and the whole hierarchy re-rolls — the
cohort knob is a SQL <code>WHERE</code> clause:</p>

<pre class="cell sql" data-name="womenEras">
SELECT d.person_id, d.drug_concept_id
FROM drug_era d JOIN person p USING (person_id)
WHERE p.gender_concept_id = 8532 AND p.year_of_birth &lt; 1960
</pre>

<pre class="cell">
// same tree, women born before 1960 only
atc = fromParentChild(classEdges, { parent: 'parent_id', child: 'child_id', label: 'concept_name' })
attachRecords(atc, womenEras, r => String(r.drug_concept_id))
atc.roots.filter(n => n.rollup().count)
  .map(n => { ru = n.rollup({ distinct: r => r.person_id })
    return `${n.label}: ${ru.distinct} pts · ${ru.count} rx` })
  .join('\n')
</pre>
```

Note the `&lt;` in the womenEras cell — it is inside HTML.

- [ ] **Step 2: Rewrite the compare cohort cell (lines 409–417)**

```html
<pre class="cell">
// cohort comparison over one classification: women vs men, by node id
cohort = ids => { const g = fromParentChild(classEdges, { parent: 'parent_id', child: 'child_id', label: 'concept_name' })
  attachRecords(g, drugEras.filter(r => ids.has(r.person_id)), r => String(r.drug_concept_id)); return g }
byGender = g => new Set(persons.filter(p => p.gender === g).map(p => p.person_id))
diff = compare(cohort(byGender('F')), cohort(byGender('M')), { by: 'id' })
interesting = diff.nodes.filter(n => n.cmp && Math.abs(n.cmp.countDelta) > 25)
interesting.map(n => `${n.label}: ${n.cmp.in} Δ${n.cmp.countDelta}`).join('\n')
</pre>
```

- [ ] **Step 3: Retire drugClasses**

- `docs/index.html`: delete the drugClasses `<li>` and
  `<div class="dataset" data-name="drugClasses"></div>` (lines 78–83).
- `docs/livecells.js`: remove `drugClasses: 'drug-classes.json',` from
  `files`.
- Delete files: `git rm docs/data/drug-classes.json && git rm -r docs/data/curation`
- Grep guard: `grep -rn "drugClasses\|drug-classes\|curation" docs --include="*.html" --include="*.js"`
  must return nothing (specs/plans may still mention them; that's fine —
  restrict the grep to html/js as shown).

- [ ] **Step 4: Verify**

`node --input-type=module --check < docs/livecells.js`, then headless
Chrome (both servers). Expected:

- `duckdb: ready (20 tables)` — unchanged: drugClasses was a JSON file,
  never a SQL table, so retiring it does not affect the count.
- grep the dump for `— ` labels like `pts · ` (rollup-baked names
  present), `attached` (match-rate line), and `Δ` (compare cell).
- The classEdges SQL cell publishes: grep for `→ window: classEdges`.
- zero `cell-error`.
- Interactive check (leave to SG, note in report): DBW subtree expands
  and shows counts on every row; womenEras counts are strictly smaller
  than the full-cohort counts.

- [ ] **Step 5: Commit**

```bash
git add docs/index.html docs/livecells.js
git rm docs/data/drug-classes.json
git rm -r docs/data/curation
git commit -m "docs site: flagship ATC example — live vocab traversal via SQL; retire drug-classes.json"
```

---

### Task 6: publish data repo + full gate

**Files:**
- Modify: `.superpowers/sdd/progress.md` (append status line)
- Remote: create + push `omop-demo-data`, enable Pages

- [ ] **Step 1: ASK SG before touching GitHub**

Creating the public repo and enabling Pages publishes SNOMED/ATC/RxNorm
content and the synthea extracts. Publishing was approved in the Task 7b
amendment, but repo creation + push still needs an explicit go-ahead
(and the final repo name — `omop-demo-data` is provisional). Ask; do not
proceed without it.

```bash
cd ~/github-repos/personal/omop-demo-data
gh repo create Sigfried/omop-demo-data --public --source . --push
gh api repos/Sigfried/omop-demo-data/pages -X POST \
  -f build_type=legacy -f 'source[branch]=master' -f 'source[path]=/'
```

- [ ] **Step 2: Verify the published data over HTTP**

Wait for Pages deploy (`gh api repos/Sigfried/omop-demo-data/pages`
→ `"status": "built"`), then:

```bash
curl -sI https://sigfried.github.io/omop-demo-data/vocab/concept.parquet \
  | grep -iE "HTTP/|accept-ranges|content-length|access-control"
```

Expected: `200`, `accept-ranges: bytes`. (CORS header may only appear
with an `Origin:` request header — check with
`-H "Origin: http://localhost:8123"` if absent.)

- [ ] **Step 3: Full headless run against the PUBLISHED data**

Same headless command but WITHOUT `&data=…` (exercises the real
`DATA_BASE` default): expect `duckdb: ready (20 tables)`, zero
`cell-error`, flagship greps from Task 5 all present.

- [ ] **Step 4: Library gate**

Run: `npm run typecheck && npm test`
Expected: 0 errors; full suite green (95 pre-existing + the new rollup
tests).

- [ ] **Step 5: Update progress + commit**

Append to `.superpowers/sdd/progress.md` under the docs-milestone
section: one line per task with commit ranges, in the established
format, noting this work implements the duckdb-demo spec/plan and that
examples-round bullets 5 (page-side citation), 7, and 8 remain open.

```bash
git add .superpowers/sdd/progress.md
git commit -m "sdd: duckdb demo progress notes"
```

Do NOT push the supergroup repo (unpushed since dca8a86 by standing
instruction).

---

## Self-review notes (kept for the executor)

- Spec coverage: data repo (T1), runtime (T3), sql()/BigInt/Date (T3),
  await-before-publish + SQL cells + table renderer (T4), rollup
  distinct (T2), flagship + cohort loop + drug-classes retirement (T5),
  error handling (T3 status line + sql rejection; T4 catch path),
  testing (T2 vitest; T3–T6 headless), open items (repo name asked in
  T6; vocab version recorded in T1; htmlTable package replacement
  explicitly deferred).
- The `rollup` opts shape (`{ value, distinct }`) resolves the spec's
  "exact signature" open item: a single union-typed argument, no second
  parameter.
- Known judgment calls an executor should NOT "fix" silently: SQL
  result tables cap at 50 rows with an explicit count line (DOM safety;
  the honest-truncation philosophy is satisfied by the visible count);
  `drug-classes.json` retirement includes the curation script because
  the data repo's `extract.sh` supersedes it.
