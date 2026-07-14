import { SGNode, type SGContext } from './node.js';
import { Supergroup } from './collection.js';
import { type DimInput, type NormalDim } from './dims.js';
export interface GroupOpts<R> {
    root?: 'none' | 'synthetic';
    excludeValues?: unknown[];
}
/** Map-identity form of a key: Dates compare by value (es6-branch fix) */
export declare function mapKey(key: unknown): unknown;
export declare function groupLevel<R>(records: R[], dim: NormalDim<R>, parent: SGNode<R> | null, ctx: SGContext, depth: number, idPrefix: string, opts: GroupOpts<R>): SGNode<R>[];
export declare function regroupNode<R>(node: SGNode<R>, dim: DimInput<R>, opts?: GroupOpts<R>): SGNode<R>[];
export declare function supergroup<R>(records: R[], dims: DimInput<R> | DimInput<R>[], opts?: GroupOpts<R>): Supergroup<R>;
