import { compact, moveItemPosition } from '@common/utils/array'
import { describe, expect, it } from 'vitest'

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

  describe('moveItemPosition', () => {
    it('should move an item to a higher position', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 1, 3)
      expect(result).toEqual(['a', 'c', 'd', 'b'])
    })

    it('should move an item to a lower position', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 3, 1)
      expect(result).toEqual(['a', 'd', 'b', 'c'])
    })

    it('should leave the array unchanged if positionToMove is equal to positionToEnd', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 2, 2)
      expect(result).toEqual(array)
    })

    it('should correctly move an item from the start to the end of the array', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 0, 3)
      expect(result).toEqual(['b', 'c', 'd', 'a'])
    })

    it('should correctly move an item from the end to the start of the array', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 3, 0)
      expect(result).toEqual(['d', 'a', 'b', 'c'])
    })

    it('should return the same array if the start and end positions are the same', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 2, 2)
      expect(result).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should handle an array with a single item', () => {
      const array = ['a']
      const result = moveItemPosition(array, 0, 0)
      expect(result).toEqual(['a'])
    })

    it('should return the same array if positionToMove is out of bounds', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 10, 2)
      expect(result).toEqual(array)
    })

    it('should return the same array if positionToEnd is out of bounds', () => {
      const array = ['a', 'b', 'c', 'd']
      const result = moveItemPosition(array, 2, 10)
      expect(result).toEqual(array)
    })
  })
})
