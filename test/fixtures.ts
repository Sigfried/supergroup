export interface Rx { vocab: string; domain: string; name: string; cost: number }

export const RXS: Rx[] = [
  { vocab: 'RxNorm', domain: 'Drug', name: 'aspirin', cost: 2 },
  { vocab: 'RxNorm', domain: 'Drug', name: 'warfarin', cost: 10 },
  { vocab: 'RxNorm', domain: 'Procedure', name: 'infusion', cost: 50 },
  { vocab: 'SNOMED', domain: 'Condition', name: 'headache', cost: 0 },
  { vocab: 'SNOMED', domain: 'Drug', name: 'aspirin', cost: 3 },
]

// dmvd-shaped digraph: multi-parent D, self-loop on E, rootless cycle F<->G
export const DAG_ITEMS = [
  { id: 'A', name: 'Alpha' },
  { id: 'B', name: 'Beta', parentIds: ['A'] },
  { id: 'C', name: 'Gamma', parentIds: ['A'] },
  { id: 'D', name: 'Delta', parentIds: ['B', 'C'] },
  { id: 'E', name: 'Epsilon', parentIds: ['B', 'E'] },
  { id: 'F', name: 'Zeta', parentIds: ['G'] },
  { id: 'G', name: 'Eta', parentIds: ['F'] },
]
