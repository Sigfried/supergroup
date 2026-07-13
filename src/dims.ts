export type DimAccessor<R> = (r: R) => unknown

export type SGNodeLike = { key: unknown; label: string; records: unknown[] }

export interface DimSpec<R> {
  by: string | DimAccessor<R>
  name?: string
  multi?: boolean
  sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number
}

export type DimInput<R> = string | DimAccessor<R> | DimSpec<R>

export interface NormalDim<R> {
  accessor: DimAccessor<R>
  name: string
  multi: boolean
  sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number
}

function toAccessor<R>(by: string | DimAccessor<R>): DimAccessor<R> {
  return typeof by === 'string' ? (r: R) => (r as Record<string, unknown>)[by] : by
}

export function normalizeDims<R>(dims: DimInput<R>[]): NormalDim<R>[] {
  return dims.map((d, i) => {
    if (typeof d === 'string') return { accessor: toAccessor<R>(d), name: d, multi: false }
    if (typeof d === 'function') return { accessor: d, name: d.name || `dim${i}`, multi: false }
    const name = d.name ?? (typeof d.by === 'string' ? d.by : d.by.name || `dim${i}`)
    return { accessor: toAccessor<R>(d.by), name, multi: d.multi ?? false, sortChildren: d.sortChildren }
  })
}
