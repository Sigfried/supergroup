import { Fifo } from './traverse.js';
export function computeMetrics(sg) {
    const indeg = new Map(sg.nodes.map(n => [n, 0]));
    for (const n of sg.nodes)
        for (const c of n.children)
            indeg.set(c, (indeg.get(c) ?? 0) + 1);
    const queue = new Fifo();
    for (const n of sg.nodes)
        if ((indeg.get(n) ?? 0) === 0)
            queue.push(n);
    const topo = [];
    let n;
    while ((n = queue.shift())) {
        topo.push(n);
        for (const c of n.children) {
            const d = (indeg.get(c) ?? 0) - 1;
            indeg.set(c, d);
            if (d === 0)
                queue.push(c);
        }
    }
    for (const n of topo) {
        n.maxDepth = n.parents.length ? Math.max(...n.parents.map(p => p.maxDepth ?? 0)) + 1 : 0;
    }
    for (let i = topo.length - 1; i >= 0; i--) {
        const n = topo[i];
        n.height = n.children.length ? Math.max(...n.children.map(c => c.height ?? 0)) + 1 : 0;
    }
}
