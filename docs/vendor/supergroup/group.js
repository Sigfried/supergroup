import { SGNode } from './node.js';
import { Supergroup } from './collection.js';
import { normalizeDims } from './dims.js';
/** Map-identity form of a key: Dates compare by value (es6-branch fix) */
export function mapKey(key) {
    return key instanceof Date ? ` date:${key.getTime()}` : key;
}
function isExcluded(key, excludeValues) {
    return !!excludeValues?.some(v => v === key || String(v) === String(key));
}
export function groupLevel(records, dim, parent, ctx, depth, idPrefix, opts) {
    const byKey = new Map();
    const usedIds = new Set();
    for (const r of records) {
        const raw = dim.accessor(r);
        const keys = dim.multi && Array.isArray(raw) ? raw : [raw];
        for (const key of keys) {
            if (isExcluded(key, opts.excludeValues))
                continue;
            const mk = mapKey(key);
            let node = byKey.get(mk);
            if (!node) {
                // distinct keys can stringify alike (1 vs '1'); ids must stay unique
                let id = idPrefix + String(key);
                for (let i = 2; usedIds.has(id); i++)
                    id = `${idPrefix + String(key)}~${i}`;
                usedIds.add(id);
                node = new SGNode({
                    id, key, label: String(key), dim: dim.name, depth, ctx,
                });
                if (parent)
                    node.parents.push(parent);
                byKey.set(mk, node);
            }
            node.records.push(r);
        }
    }
    const level = [...byKey.values()];
    if (dim.sortChildren)
        level.sort(dim.sortChildren);
    if (parent)
        parent.children = level;
    return level;
}
export function regroupNode(node, dim, opts = {}) {
    const [nd] = normalizeDims([dim]);
    for (const c of node.children)
        c.parents = c.parents.filter(p => p !== node);
    node.children = [];
    const prefix = node.synthetic ? '' : `${node.id}/`;
    return groupLevel(node.records, nd, node, node.ctx, node.depth + 1, prefix, opts);
}
export function supergroup(records, dims, opts = {}) {
    const nd = normalizeDims(Array.isArray(dims) ? dims : [dims]);
    const ctx = { totalRecords: records.length };
    const root = opts.root === 'synthetic'
        ? new SGNode({ id: '(root)', key: null, label: 'root', records: [...records], synthetic: true, ctx })
        : undefined;
    const build = (parent, recs, i, depth, prefix) => {
        if (i >= nd.length)
            return [];
        const level = groupLevel(recs, nd[i], parent, ctx, depth, prefix, opts);
        for (const n of level)
            build(n, n.records, i + 1, depth + 1, `${n.id}/`);
        return level;
    };
    const roots = build(root ?? null, records, 0, root ? 1 : 0, '');
    return new Supergroup(roots, { root, ctx });
}
