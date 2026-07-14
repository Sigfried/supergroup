export function attachRecords(sg, records, byKey) {
    const byId = new Map(sg.nodes.map(n => [n.id, n]));
    const unmatched = [];
    let matched = 0;
    for (const r of records) {
        const raw = byKey(r);
        const ids = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
        const hits = new Set();
        for (const id of ids) {
            const n = byId.get(id);
            if (n)
                hits.add(n);
        }
        if (!hits.size) {
            unmatched.push(r);
            continue;
        }
        matched++;
        for (const n of hits)
            n.records.push(r);
    }
    sg.ctx.totalRecords += records.length;
    return { matched, unmatched };
}
