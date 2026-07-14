import { Supergroup } from '../collection.js';
export interface DagItem {
    id: string;
    name?: string;
    parentIds?: string[];
}
export declare function buildDag<R>(items: DagItem[]): Supergroup<R>;
