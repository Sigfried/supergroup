import * as core from 'supergroup'
import * as dagMod from 'supergroup/dag'
import * as seqMod from 'supergroup/sequence'
import * as cmpMod from 'supergroup/compare'
import * as adapters from 'supergroup/adapters'
import * as fmtMod from 'supergroup/formatting'
import * as d3 from 'd3'
import { basicSetup, EditorView } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'

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
