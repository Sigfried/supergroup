import { describe, it, expect } from 'vitest'
import * as core from '../src/index'
import * as dag from '../src/dag/index'
import * as adapters from '../src/adapters/index'

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
})
