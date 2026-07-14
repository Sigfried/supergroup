import { SGNode } from '../node.js';
import { Supergroup } from '../collection.js';
import { mapKey } from '../group.js';
export function compare(a, b, opts = {}) {
    const matchKey = opts.by === 'id'
        ? (n) => n.id
        : (n) => String(mapKey(n.key));
    const ctx = { totalRecords: a.ctx.totalRecords + b.ctx.totalRecords };
    const memo = opts.by === 'id' ? new Map() : null;
    const aById = opts.by === 'id' ? new Map(a.nodes.map(n => [n.id, n])) : null;
    const bById = opts.by === 'id' ? new Map(b.nodes.map(n => [n.id, n])) : null;
    const mergeLevel = (aNodes, bNodes, parent, depth, prefix) => {
        const order = [];
        const pairs = new Map();
        for (const n of aNodes) {
            const k = matchKey(n);
            if (!pairs.has(k)) {
                pairs.set(k, {});
                order.push(k);
            }
            const p = pairs.get(k);
            if (p.a)
                throw new Error(`compare: duplicate match key '${k}' within one collection's level — keys must be unique per level (disambiguate or use by: 'id')`);
            p.a = n;
        }
        for (const n of bNodes) {
            const k = matchKey(n);
            if (!pairs.has(k)) {
                pairs.set(k, {});
                order.push(k);
            }
            const p = pairs.get(k);
            if (p.b)
                throw new Error(`compare: duplicate match key '${k}' within one collection's level — keys must be unique per level (disambiguate or use by: 'id')`);
            p.b = n;
        }
        return order.map(k => {
            const done = memo?.get(k);
            if (done) {
                if (parent && !done.parents.includes(parent))
                    done.parents.push(parent);
                return done;
            }
            const pair = pairs.get(k);
            const an = aById ? aById.get(k) : pair.a;
            const bn = bById ? bById.get(k) : pair.b;
            const src = (an ?? bn);
            const node = new SGNode({
                // id mode: the match key IS the source id — keep it, no path prefix
                id: memo ? k : prefix + String(src.key),
                key: src.key, label: src.label, dim: src.dim, direction: src.direction,
                records: [...new Set([...(an?.records ?? []), ...(bn?.records ?? [])])], depth, ctx,
            });
            node.cmp = {
                in: an && bn ? 'both' : an ? 'a' : 'b',
                a: an, b: bn,
                countDelta: (bn?.records.length ?? 0) - (an?.records.length ?? 0),
            };
            if (parent)
                node.parents.push(parent);
            memo?.set(k, node);
            node.children = mergeLevel(an?.children ?? [], bn?.children ?? [], node, depth + 1, `${node.id}/`);
            return node;
        });
    };
    const roots = mergeLevel(a.roots, b.roots, null, 0, '');
    return new Supergroup(roots, { ctx });
}
