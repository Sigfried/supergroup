export type DimAccessor<R> = (r: R) => unknown;
export type SGNodeLike = {
    key: unknown;
    label: string;
    records: unknown[];
};
export interface DimSpec<R> {
    by: string | DimAccessor<R>;
    name?: string;
    multi?: boolean;
    sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number;
}
export type DimInput<R> = string | DimAccessor<R> | DimSpec<R>;
export interface NormalDim<R> {
    accessor: DimAccessor<R>;
    name: string;
    multi: boolean;
    sortChildren?: (a: SGNodeLike, b: SGNodeLike) => number;
}
export declare function normalizeDims<R>(dims: DimInput<R>[]): NormalDim<R>[];
