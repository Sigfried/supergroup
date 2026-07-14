function toAccessor(by) {
    return typeof by === 'string' ? (r) => r[by] : by;
}
export function normalizeDims(dims) {
    return dims.map((d, i) => {
        if (typeof d === 'string')
            return { accessor: toAccessor(d), name: d, multi: false };
        if (typeof d === 'function')
            return { accessor: d, name: d.name || `dim${i}`, multi: false };
        const name = d.name ?? (typeof d.by === 'string' ? d.by : d.by.name || `dim${i}`);
        return { accessor: toAccessor(d.by), name, multi: d.multi ?? false, sortChildren: d.sortChildren };
    });
}
