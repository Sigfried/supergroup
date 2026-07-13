import { buildDag, type DagItem } from './build'
import { computeMetrics } from './metrics'
import type { Supergroup } from '../collection'

export function fromParentIds<R>(items: DagItem[]): Supergroup<R> {
  const sg = buildDag<R>(items)
  computeMetrics(sg)
  return sg
}
