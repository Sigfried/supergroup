export function toDagBrowserNodes(sg) {
    const backParents = new Map();
    for (const { parent, child } of sg.backedges) {
        const arr = backParents.get(child.id);
        if (arr)
            arr.push(parent.id);
        else
            backParents.set(child.id, [parent.id]);
    }
    return sg.nodes
        .filter(n => !n.synthetic)
        .map(n => ({
        id: n.id,
        name: n.label,
        parentIds: [
            ...n.parents.filter(p => !p.synthetic).map(p => p.id),
            ...(backParents.get(n.id) ?? []),
        ],
    }));
}
