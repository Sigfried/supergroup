import type { SGNode } from '../node.js';
import { Supergroup } from '../collection.js';
export interface PrettyPrintOpts<R> {
    /** levels shown; omitted = all */
    maxDepth?: number;
    /** children listed per node; omitted = all */
    maxChildren?: number;
    /** per-node line; default: label + record count + cmp when present */
    fmt?: (n: SGNode<R>) => string;
    /** box-drawing rails instead of plain two-space indentation */
    rails?: boolean;
}
type Printable<R> = Supergroup<R> | SGNode<R> | SGNode<R>[];
export declare function prettyPrint<R>(x: Printable<R>, opts?: PrettyPrintOpts<R>): string;
export declare function summary<R>(x: Printable<R>): string;
export interface ToTableOpts {
    /** rows shown; omitted = all */
    maxRows?: number;
    /** column selection + order; default: keys of the first record */
    columns?: string[];
}
export declare function toTable(records: readonly object[], opts?: ToTableOpts): string;
export {};
