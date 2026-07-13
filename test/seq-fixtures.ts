export interface Evt {
  ent: string
  evt: string
  t: number
  next?: Evt
  prev?: Evt
}

/** Build linked event records per entity: { e1: ['A','B'] } → A<->B chain */
export function makeTimelines(spec: Record<string, string[]>): Evt[] {
  const all: Evt[] = []
  for (const [ent, names] of Object.entries(spec)) {
    let prev: Evt | undefined
    names.forEach((evt, i) => {
      const e: Evt = { ent, evt, t: i }
      if (prev) {
        prev.next = e
        e.prev = prev
      }
      all.push(e)
      prev = e
    })
  }
  return all
}

export const TL = { e1: ['A', 'B', 'C'], e2: ['A', 'C'], e3: ['B', 'C'] }
