import type { SGNode } from '../node'
import { Supergroup } from '../collection'

export interface D3Node<R> {
  id: string
  name: string
  key: unknown
  records: R[]
  children?: D3Node<R>[]
}

export interface ToD3Opts { onRepeat?: 'firstOccurrence' | 'repeat' }

export function toD3<R>(target: SGNode<R> | Supergroup<R>, opts: ToD3Opts = {}): D3Node<R> {
  // 'repeat' recurses without a seen-set (children edges are acyclic);
  // 'firstOccurrence' skips nodes already emitted elsewhere.
  const seen = (opts.onRepeat ?? 'firstOccurrence') === 'firstOccurrence'
    ? new Set<SGNode<R>>()
    : null
  const convert = (n: SGNode<R>): D3Node<R> => {
    seen?.add(n)
    const kids: D3Node<R>[] = []
    for (const c of n.children) {
      if (seen?.has(c)) continue
      kids.push(convert(c))
    }
    const out: D3Node<R> = { id: n.id, name: n.label, key: n.key, records: n.records }
    if (kids.length) out.children = kids
    return out
  }
  if (target instanceof Supergroup) {
    if (target.root) return convert(target.root)
    return {
      id: '(root)', name: 'root', key: null, records: [],
      children: target.roots.map(r => convert(r)),
    }
  }
  return convert(target)
}
