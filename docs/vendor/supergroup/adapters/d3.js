import { Supergroup } from '../collection.js';
export function toD3(target, opts = {}) {
    // 'repeat' recurses without a seen-set (children edges are acyclic);
    // 'firstOccurrence' skips nodes already emitted elsewhere.
    const seen = (opts.onRepeat ?? 'firstOccurrence') === 'firstOccurrence'
        ? new Set()
        : null;
    const convert = (n) => {
        seen?.add(n);
        const kids = [];
        for (const c of n.children) {
            if (seen?.has(c))
                continue;
            kids.push(convert(c));
        }
        const out = { id: n.id, name: n.label, key: n.key, records: n.records };
        if (kids.length)
            out.children = kids;
        return out;
    };
    if (target instanceof Supergroup) {
        if (target.root)
            return convert(target.root);
        return {
            id: '(root)', name: 'root', key: null, records: [],
            children: target.roots.map(r => convert(r)),
        };
    }
    return convert(target);
}
