/** FIFO queue with amortized O(1) shift (array + head index) */
export class Fifo {
    items = [];
    head = 0;
    push(x) { this.items.push(x); }
    shift() {
        if (this.head >= this.items.length)
            return undefined;
        const x = this.items[this.head];
        this.items[this.head++] = undefined;
        if (this.head > 1024 && this.head * 2 > this.items.length) {
            this.items = this.items.slice(this.head);
            this.head = 0;
        }
        return x;
    }
    get length() { return this.items.length - this.head; }
}
/** min-depth BFS over children edges; roots get depth 0 (dedup by node id) */
export function assignMinDepths(roots) {
    const seen = new Set(roots.map(r => r.id));
    const queue = new Fifo();
    for (const r of roots) {
        r.depth = 0;
        queue.push(r);
    }
    let n;
    while ((n = queue.shift())) {
        for (const c of n.children) {
            if (seen.has(c.id))
                continue;
            seen.add(c.id);
            c.depth = n.depth + 1;
            queue.push(c);
        }
    }
}
