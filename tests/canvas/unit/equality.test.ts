import { shallowEqual } from '@canvas/utils/equality'
import { describe, expect, it } from 'vitest'

describe('shallowEqual', () => {
  it('compares primitives and references with Object.is', () => {
    expect(shallowEqual(1, 1)).toBe(true)
    expect(shallowEqual('a', 'b')).toBe(false)
    expect(shallowEqual(Number.NaN, Number.NaN)).toBe(true)
    expect(shallowEqual(null, null)).toBe(true)
    expect(shallowEqual<unknown>(null, {})).toBe(false)
    const object = { a: 1 }
    expect(shallowEqual(object, object)).toBe(true)
  })

  it('compares the first level of objects', () => {
    const shapes: unknown[] = []
    expect(shallowEqual({ a: 1, shapes }, { a: 1, shapes })).toBe(true)
    expect(shallowEqual({ a: 1, shapes }, { a: 1, shapes: [] })).toBe(false)
    expect(shallowEqual<Record<string, unknown>>({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(shallowEqual<Record<string, unknown>>({ a: 1, b: undefined }, { a: 1, c: undefined })).toBe(false)
  })

  it('compares the items of arrays', () => {
    const shape = { id: 'a' }
    expect(shallowEqual([shape, 1], [shape, 1])).toBe(true)
    expect(shallowEqual([shape], [{ id: 'a' }])).toBe(false)
    expect(shallowEqual([1], [1, 2])).toBe(false)
    expect(shallowEqual<unknown>([], {})).toBe(false)
  })
})
