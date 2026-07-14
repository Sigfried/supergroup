import { describe, it, expect } from 'vitest'
import * as core from '../src/index'
import * as dag from '../src/dag/index'
import * as adapters from '../src/adapters/index'
import * as sequence from '../src/sequence/index'
import * as cmp from '../src/compare/index'
import * as formatting from '../src/formatting/index'

describe('public export surfaces', () => {
  it('core', () => {
    for (const name of ['supergroup', 'Supergroup', 'SGNode', 'normalizeDims', 'recordsFor', 'recordsUnder', 'regroupNode'])
      expect(core, name).toHaveProperty(name)
  })
  it('dag', () => {
    for (const name of ['fromParentIds', 'fromEdges', 'fromParentChild', 'attachRecords', 'subgraph', 'computeMetrics', 'buildDag'])
      expect(dag, name).toHaveProperty(name)
  })
  it('adapters', () => {
    expect(adapters).toHaveProperty('toDagBrowserNodes')
  })
  it('sequence', () => {
    expect(sequence).toHaveProperty('groupBySequence')
  })
  it('compare', () => {
    expect(cmp).toHaveProperty('compare')
  })
  it('adapters include toD3', () => {
    expect(adapters).toHaveProperty('toD3')
  })
  it('formatting', () => {
    for (const name of ['prettyPrint', 'summary', 'toTable'])
      expect(formatting, name).toHaveProperty(name)
  })
})
