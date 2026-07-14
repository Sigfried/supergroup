import { recordsUnder } from './selection.js';
import { regroupNode } from './group.js';
export class SGNode {
    id;
    key;
    label;
    dim;
    records;
    parents = [];
    children = [];
    depth;
    synthetic;
    direction;
    maxDepth; // dag module fills these
    height;
    cmp;
    ctx;
    constructor(init) {
        this.id = init.id;
        this.key = init.key;
        this.label = init.label;
        this.dim = init.dim;
        this.records = init.records ?? [];
        this.depth = init.depth ?? 0;
        this.synthetic = init.synthetic;
        this.direction = init.direction;
        this.ctx = init.ctx;
    }
    toString() { return this.label; }
    ancestors() {
        const seen = new Set();
        const out = [];
        const stack = [...this.parents];
        while (stack.length) {
            const n = stack.pop();
            if (seen.has(n))
                continue;
            seen.add(n);
            out.push(n);
            stack.push(...n.parents);
        }
        return out;
    }
    descendants() {
        const seen = new Set();
        const out = [];
        const stack = [...this.children];
        while (stack.length) {
            const n = stack.pop();
            if (seen.has(n))
                continue;
            seen.add(n);
            out.push(n);
            stack.push(...n.children);
        }
        return out;
    }
    leaves() {
        if (!this.children.length)
            return [this];
        return this.descendants().filter(n => !n.children.length);
    }
    pedigree() {
        const out = [this];
        let n = this;
        while (n.parents[0]) {
            n = n.parents[0];
            out.unshift(n);
        }
        return out;
    }
    path() {
        const keys = this.pedigree().filter(n => !n.synthetic).map(n => n.key);
        if (this.direction === 'backward')
            keys.reverse();
        return keys;
    }
    namePath(sep = '/') {
        const labels = this.pedigree().filter(n => !n.synthetic).map(n => n.label);
        if (this.direction === 'backward')
            labels.reverse();
        return labels.join(sep);
    }
    agg(accessor) { return aggregate(this.records, accessor); }
    /**
     * Fraction of the collection's total records under this node. On dag
     * collections totalRecords is 0 until attachRecords runs (pct() = NaN),
     * and unmatched records still count in the denominator.
     */
    pct() { return this.records.length / this.ctx.totalRecords; }
    /** union-then-aggregate over this node and all descendants; never sum-over-paths */
    rollup(accessor) {
        const recs = recordsUnder([this]);
        return accessor ? aggregate(recs, accessor) : { count: recs.length };
    }
    groupChildren(dim, opts) {
        return regroupNode(this, dim, opts);
    }
}
function aggregate(records, accessor) {
    let sum = 0, min = Infinity, max = -Infinity;
    for (const r of records) {
        const v = accessor(r);
        sum += v;
        if (v < min)
            min = v;
        if (v > max)
            max = v;
    }
    const count = records.length;
    return { count, sum, mean: count ? sum / count : NaN, min: count ? min : NaN, max: count ? max : NaN };
}
