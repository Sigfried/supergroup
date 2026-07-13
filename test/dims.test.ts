import { describe, it, expect } from 'vitest'
import { normalizeDims } from '../src/dims'

interface Rec { vocab: string; tags: string[] }

describe('normalizeDims', () => {
  it('turns a string into a property accessor named after it', () => {
    const [d] = normalizeDims<Rec>(['vocab'])
    expect(d!.name).toBe('vocab')
    expect(d!.multi).toBe(false)
    expect(d!.accessor({ vocab: 'RxNorm', tags: [] })).toBe('RxNorm')
  })
  it('keeps a function accessor, naming it from fn.name or position', () => {
    const byVocab = (r: Rec) => r.vocab
    const [a, b] = normalizeDims<Rec>([byVocab, (r) => r.tags.length])
    expect(a!.name).toBe('byVocab')
    expect(b!.name).toBe('dim1')
  })
  it('accepts a DimSpec with multi and explicit name', () => {
    const [d] = normalizeDims<Rec>([{ by: 'tags', name: 'tag', multi: true }])
    expect(d!.name).toBe('tag')
    expect(d!.multi).toBe(true)
    expect(d!.accessor({ vocab: 'x', tags: ['a'] })).toEqual(['a'])
  })
})
