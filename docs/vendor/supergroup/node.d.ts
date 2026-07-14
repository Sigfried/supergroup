import { type GroupOpts } from './group.js';
import type { DimInput } from './dims.js';
export interface SGContext {
    totalRecords: number;
}
export interface Agg {
    count: number;
    sum: number;
    mean: number;
    min: number;
    max: number;
}
export interface CmpInfo<R> {
    in: 'a' | 'b' | 'both';
    a?: SGNode<R>;
    b?: SGNode<R>;
    countDelta: number;
}
export interface SGNodeInit<R> {
    id: string;
    key: unknown;
    label: string;
    dim?: string;
    records?: R[];
    depth?: number;
    synthetic?: boolean;
    direction?: 'forward' | 'backward';
    ctx: SGContext;
}
export declare class SGNode<R> {
    id: string;
    key: unknown;
    label: string;
    dim?: string;
    records: R[];
    parents: SGNode<R>[];
    children: SGNode<R>[];
    depth: number;
    synthetic?: boolean;
    direction?: 'forward' | 'backward';
    maxDepth?: number;
    height?: number;
    cmp?: CmpInfo<R>;
    ctx: SGContext;
    constructor(init: SGNodeInit<R>);
    toString(): string;
    ancestors(): SGNode<R>[];
    descendants(): SGNode<R>[];
    leaves(): SGNode<R>[];
    pedigree(): SGNode<R>[];
    path(): unknown[];
    namePath(sep?: string): string;
    agg(accessor: (r: R) => number): Agg;
    /**
     * Fraction of the collection's total records under this node. On dag
     * collections totalRecords is 0 until attachRecords runs (pct() = NaN),
     * and unmatched records still count in the denominator.
     */
    pct(): number;
    /** union-then-aggregate over this node and all descendants; never sum-over-paths */
    rollup(accessor?: (r: R) => number): {
        count: number;
    } & Partial<Agg>;
    groupChildren(dim: DimInput<R>, opts?: GroupOpts<R>): SGNode<R>[];
}
