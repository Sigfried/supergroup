import type { Supergroup } from '../collection.js';
export declare function attachRecords<R>(sg: Supergroup<R>, records: R[], byKey: (r: R) => string | string[] | null | undefined): {
    matched: number;
    unmatched: R[];
};
