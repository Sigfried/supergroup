import { buildDag, type DagItem } from './build'
import type { Supergroup } from '../collection'

export function fromParentIds<R>(items: DagItem[]): Supergroup<R> {
  return buildDag<R>(items)
}
