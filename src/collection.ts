import type { SGContext, SGNode } from './node'

export type BackEdge<R> = { parent: SGNode<R>; child: SGNode<R> }

export class Supergroup<R> {
  roots: SGNode<R>[]
  root?: SGNode<R>
  nodes: SGNode<R>[]
  backedges: BackEdge<R>[]
  ctx: SGContext

  constructor(roots: SGNode<R>[], opts: { root?: SGNode<R>; backedges?: BackEdge<R>[]; ctx: SGContext }) {
    this.roots = roots
    this.root = opts.root
    this.backedges = opts.backedges ?? []
    this.ctx = opts.ctx
    this.nodes = this.computeNodes()
  }

  /** iterative DFS pre-order; each node once, even multi-parent nodes */
  private computeNodes(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const start = this.root ? [this.root] : this.roots
    const stack = [...start].reverse()
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!)
    }
    return out
  }

  flatten(): SGNode<R>[] { return this.nodes }
}
