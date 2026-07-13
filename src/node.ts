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
}
