import { clamp, compact, uniqueId, withDefaults } from '@editor/utils/util'
import { describe, expect, it } from 'vitest'

// Same tests as the helpers of the canvas: the editor keeps its own copy of them
describe('editor/utils/util', () => {
  describe('uniqueId', () => {
    it('should generate unique IDs with a given prefix', () => {
      const id1 = uniqueId('test_')
      const id2 = uniqueId('test_')
      const id3 = uniqueId('test_')

      expect(id1).toBe('test_1')
      expect(id2).toBe('test_2')
      expect(id3).toBe('test_3')
    })

    it('should generate unique IDs without a prefix', () => {
      const id1 = uniqueId()
      const id2 = uniqueId()
      const id3 = uniqueId()

      expect(id1).toBe('1')
      expect(id2).toBe('2')
      expect(id3).toBe('3')
    })

    it('should reset and increment IDs independently for different prefixes', () => {
      const id1 = uniqueId('prefix1_')
      const id2 = uniqueId('prefix2_')
      const id3 = uniqueId('prefix1_')
      const id4 = uniqueId('prefix2_')

      expect(id1).toBe('prefix1_1')
      expect(id2).toBe('prefix2_1')
      expect(id3).toBe('prefix1_2')
      expect(id4).toBe('prefix2_2')
    })

    it('should generate unique IDs even with an empty string as a prefix', () => {
      const id1 = uniqueId('')
      const id2 = uniqueId('')
      const id3 = uniqueId('')

      expect(id1).toBe('4')
      expect(id2).toBe('5')
      expect(id3).toBe('6')
    })

    it('should maintain a global counter for the same prefix', () => {
      const id1 = uniqueId('global_')
      const id2 = uniqueId('global_')

      expect(id1).toBe('global_1')
      expect(id2).toBe('global_2')

      // Simulating external reset of the global counter
      const id3 = uniqueId('global_')
      expect(id3).toBe('global_3')
    })
  })

  describe('clamp', () => {
    it('should return min if the value is less than min', () => {
      expect(clamp(1, 5, 10)).toBe(5)
    })

    it('should return max if the value is greater than max', () => {
      expect(clamp(15, 5, 10)).toBe(10)
    })

    it('should return the value itself if it is between min and max', () => {
      expect(clamp(7, 5, 10)).toBe(7)
    })

    it('should return min if the value is equal to min', () => {
      expect(clamp(5, 5, 10)).toBe(5)
    })

    it('should return max if the value is equal to max', () => {
      expect(clamp(10, 5, 10)).toBe(10)
    })

    it('handles negative values correctly for min, max, and value', () => {
      expect(clamp(-3, -10, -5)).toBe(-5)
      expect(clamp(-7, -10, -5)).toBe(-7)
      expect(clamp(-15, -10, -5)).toBe(-10)
    })

    it('works correctly when min and max are equal', () => {
      expect(clamp(8, 5, 5)).toBe(5)
      expect(clamp(10, 10, 10)).toBe(10)
    })
  })

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

  describe('withDefaults', () => {
    const defaults = { color: 'black', width: 2, nested: { a: 1, b: 2 } }

    it('should return the defaults when there are no options', () => {
      expect(withDefaults(defaults, undefined)).toEqual(defaults)
    })

    it('should override the defaults with the options', () => {
      expect(withDefaults(defaults, { color: 'red' })).toEqual({ color: 'red', width: 2, nested: { a: 1, b: 2 } })
    })

    it('should ignore the options set to undefined', () => {
      expect(withDefaults(defaults, { color: undefined, width: 4 })).toEqual({ color: 'black', width: 4, nested: { a: 1, b: 2 } })
    })

    it('should keep the options set to null or to falsy values', () => {
      expect(withDefaults(defaults, { color: null, width: 0 })).toEqual({ color: null, width: 0, nested: { a: 1, b: 2 } })
    })

    it('should replace nested objects instead of merging them', () => {
      expect(withDefaults(defaults, { nested: { a: 3 } })).toEqual({ color: 'black', width: 2, nested: { a: 3 } })
    })

    it('should not mutate the defaults', () => {
      withDefaults(defaults, { color: 'red' })
      expect(defaults).toEqual({ color: 'black', width: 2, nested: { a: 1, b: 2 } })
    })
  })
})
