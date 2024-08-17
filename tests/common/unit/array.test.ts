import { describe, it, expect } from 'vitest'
import { compact } from '@common/utils/array'

describe('compact', () => {
  it('should remove undefined and null values from an array', () => {
    const array = [1, null, 2, undefined, 3, null, 4]
    const result = compact(array)
    expect(result).toEqual([1, 2, 3, 4])
  })

  it('should return an empty array if all elements are undefined or null', () => {
    const array = [undefined, null, undefined, null]
    const result = compact(array)
    expect(result).toEqual([])
  })

  it('should return the same array if no undefined or null values are present', () => {
    const array = [1, 2, 3, 4]
    const result = compact(array)
    expect(result).toEqual([1, 2, 3, 4])
  })

  it('should work with an empty array', () => {
    const array: (number | undefined | null)[] = []
    const result = compact(array)
    expect(result).toEqual([])
  })

  it('should handle arrays with different types of values', () => {
    const array = [1, 'string', null, undefined, true, false, 0]
    const result = compact(array)
    expect(result).toEqual([1, 'string', true, false, 0])
  })
})
