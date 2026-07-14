export class Supergroup {
    roots;
    root;
    nodes;
    backedges;
    ctx;
    constructor(roots, opts) {
        this.roots = roots;
        this.root = opts.root;
        this.backedges = opts.backedges ?? [];
        this.ctx = opts.ctx;
        this.nodes = this.computeNodes();
    }
    /** iterative DFS pre-order; each node once, even multi-parent nodes */
    computeNodes() {
        const seen = new Set();
        const out = [];
        const start = this.root ? [this.root] : this.roots;
        const stack = [...start].reverse();
        while (stack.length) {
            const n = stack.pop();
            if (seen.has(n))
                continue;
            seen.add(n);
            out.push(n);
            for (let i = n.children.length - 1; i >= 0; i--)
                stack.push(n.children[i]);
        }
        return out;
    }
    flatten() { return this.nodes; }
    node(path) {
        const segs = typeof path === 'string' ? path.split('/') : path;
        let level = this.roots;
        let found;
        for (const seg of segs) {
            found = level.find(n => n.key === seg || String(n.key) === String(seg));
            if (!found)
                return undefined;
            level = found.children;
        }
        return found;
    }
    select(arg) {
        if (typeof arg === 'function')
            return this.nodes.filter(n => arg(n));
        const wanted = new Set(arg.map(String));
        return this.nodes.filter(n => wanted.has(n.id) || wanted.has(String(n.key)));
    }
    /** refresh the DFS node index after post-construction structural edits */
    reindex() { this.nodes = this.computeNodes(); }
}
