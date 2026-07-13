import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/index'

describe('scaffold', () => {
  it('imports the ESM source', () => {
    expect(VERSION).toBe('2.0.0-dev')
  })
})
