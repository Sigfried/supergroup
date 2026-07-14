import type { SGNode } from '../node.js';
/** FIFO queue with amortized O(1) shift (array + head index) */
export declare class Fifo<T> {
    private items;
    private head;
    push(x: T): void;
    shift(): T | undefined;
    get length(): number;
}
/** min-depth BFS over children edges; roots get depth 0 (dedup by node id) */
export declare function assignMinDepths<R>(roots: SGNode<R>[]): void;
