import { type DagItem } from './build.js';
import type { Supergroup } from '../collection.js';
export interface DagRecordOpts<R> {
    records?: R[];
    recordKey?: (r: R) => string | string[] | null | undefined;
}
export declare function fromParentIds<R>(items: DagItem[], opts?: DagRecordOpts<R>): Supergroup<R>;
export declare function fromEdges<R>(edges: [string, string][], nodes?: {
    id: string;
    name?: string;
}[], opts?: DagRecordOpts<R>): Supergroup<R>;
export declare function fromParentChild<R, Row>(rows: Row[], opts: {
    parent: string | ((row: Row) => unknown);
    child: string | ((row: Row) => unknown);
    label?: string | ((row: Row) => string);
}, recordOpts?: DagRecordOpts<R>): Supergroup<R>;
