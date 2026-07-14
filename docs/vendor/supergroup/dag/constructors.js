import { buildDag } from './build.js';
import { computeMetrics } from './metrics.js';
import { attachRecords } from './records.js';
export function fromParentIds(items, opts = {}) {
    const sg = buildDag(items);
    computeMetrics(sg);
    if (opts.records && opts.recordKey)
        attachRecords(sg, opts.records, opts.recordKey);
    return sg;
}
export function fromEdges(edges, nodes, opts = {}) {
    const items = new Map();
    for (const n of nodes ?? [])
        items.set(n.id, { id: n.id, name: n.name, parentIds: [] });
    const ensure = (id) => {
        let it = items.get(id);
        if (!it) {
            it = { id, parentIds: [] };
            items.set(id, it);
        }
        return it;
    };
    for (const [pid, cid] of edges) {
        ensure(pid);
        ensure(cid).parentIds.push(pid);
    }
    return fromParentIds([...items.values()], opts);
}
export function fromParentChild(rows, opts, recordOpts = {}) {
    const col = (spec) => typeof spec === 'string' ? (row) => row[spec] : spec;
    const parentOf = col(opts.parent);
    const childOf = col(opts.child);
    // label conflicts are last-write-wins: when multiple rows name the same
    // child with different labels, the last row's label sticks
    const labelOf = opts.label ? col(opts.label) : undefined;
    const items = new Map();
    const ensure = (id) => {
        let it = items.get(id);
        if (!it) {
            it = { id, parentIds: [] };
            items.set(id, it);
        }
        return it;
    };
    for (const row of rows) {
        const cid = String(childOf(row));
        const it = ensure(cid);
        if (labelOf)
            it.name = String(labelOf(row));
        const pRaw = parentOf(row);
        if (pRaw == null || pRaw === '')
            continue;
        const pid = String(pRaw);
        ensure(pid);
        it.parentIds.push(pid);
    }
    return fromParentIds([...items.values()], recordOpts);
}
