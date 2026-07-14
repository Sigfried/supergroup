import type { SGContext, SGNode } from './node.js';
export type BackEdge<R> = {
    parent: SGNode<R>;
    child: SGNode<R>;
};
export declare class Supergroup<R> {
    roots: SGNode<R>[];
    root?: SGNode<R>;
    nodes: SGNode<R>[];
    backedges: BackEdge<R>[];
    ctx: SGContext;
    constructor(roots: SGNode<R>[], opts: {
        root?: SGNode<R>;
        backedges?: BackEdge<R>[];
        ctx: SGContext;
    });
    /** iterative DFS pre-order; each node once, even multi-parent nodes */
    private computeNodes;
    flatten(): SGNode<R>[];
    node(path: string | unknown[]): SGNode<R> | undefined;
    select(arg: ((n: SGNode<R>) => boolean) | unknown[]): SGNode<R>[];
    /** refresh the DFS node index after post-construction structural edits */
    reindex(): void;
}
