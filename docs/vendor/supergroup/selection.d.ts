import type { SGNode } from './node.js';
/**
 * Records are deduped by reference identity (Set<R>): the same logical
 * record loaded as two distinct objects counts twice. Keep one object per
 * record if you rely on union semantics.
 */
export declare function recordsFor<R>(nodes: SGNode<R>[]): R[];
export declare function recordsUnder<R>(nodes: SGNode<R>[]): R[];
