export interface SGContext { totalRecords: number }

export interface SGNodeInit<R> {
  id: string
  key: unknown
  label: string
  dim?: string
  records?: R[]
  depth?: number
  synthetic?: boolean
  ctx: SGContext
}

export class SGNode<R> {
  id: string
  key: unknown
  label: string
  dim?: string
  records: R[]
  parents: SGNode<R>[] = []
  children: SGNode<R>[] = []
  depth: number
  synthetic?: boolean
  maxDepth?: number   // dag module fills these
  height?: number
  ctx: SGContext

  constructor(init: SGNodeInit<R>) {
    this.id = init.id
    this.key = init.key
    this.label = init.label
    this.dim = init.dim
    this.records = init.records ?? []
    this.depth = init.depth ?? 0
    this.synthetic = init.synthetic
    this.ctx = init.ctx
  }

  toString(): string { return this.label }

  ancestors(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const stack = [...this.parents]
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      stack.push(...n.parents)
    }
    return out
  }

  descendants(): SGNode<R>[] {
    const seen = new Set<SGNode<R>>()
    const out: SGNode<R>[] = []
    const stack = [...this.children]
    while (stack.length) {
      const n = stack.pop()!
      if (seen.has(n)) continue
      seen.add(n)
      out.push(n)
      stack.push(...n.children)
    }
    return out
  }

  leaves(): SGNode<R>[] {
    if (!this.children.length) return [this]
    return this.descendants().filter(n => !n.children.length)
  }

  pedigree(): SGNode<R>[] {
    const out: SGNode<R>[] = [this]
    let n: SGNode<R> = this
    while (n.parents[0]) { n = n.parents[0]; out.unshift(n) }
    return out
  }

  path(): unknown[] { return this.pedigree().filter(n => !n.synthetic).map(n => n.key) }

  namePath(sep = '/'): string {
    return this.pedigree().filter(n => !n.synthetic).map(n => n.label).join(sep)
  }
}
