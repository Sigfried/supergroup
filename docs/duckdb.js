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
    setStatus(`failed: ${e?.message ?? e} — reload to retry`)
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
