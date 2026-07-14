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
