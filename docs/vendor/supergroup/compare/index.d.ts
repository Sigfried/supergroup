import { Supergroup } from '../collection.js';
export interface CompareOpts {
    by?: 'path' | 'id';
}
export declare function compare<R>(a: Supergroup<R>, b: Supergroup<R>, opts?: CompareOpts): Supergroup<R>;
