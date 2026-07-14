import type { Supergroup } from '../collection.js';
export interface DagBrowserNode {
    id: string;
    name: string;
    parentIds: string[];
}
export declare function toDagBrowserNodes<R>(sg: Supergroup<R>): DagBrowserNode[];
