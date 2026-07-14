import { Supergroup } from '../collection.js';
export interface SequenceOpts<R> {
    key: string | ((r: R) => unknown);
    next?: (r: R) => R | null | undefined;
    prev?: (r: R) => R | null | undefined;
    direction: 'forward' | 'backward' | 'both';
    maxDepth?: number;
}
export declare function groupBySequence<R>(startRecords: R[], opts: SequenceOpts<R>): Supergroup<R>;
