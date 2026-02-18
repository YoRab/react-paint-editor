import { isEqual, mergeWith, omit, set } from '@common/utils/object'
import { describe, expect, it } from 'vitest'

describe('common/utils/object', () => {
  describe('omit', () => {
    it('should omit specified keys from the object', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(['b', 'c'], obj)
      expect(result).toEqual({ a: 1 })
    })

    it('should return the original object if no keys are specified', () => {
      const obj = { a: 1, b: 2 }
      const result = omit([], obj)
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should return an empty object if all keys are omitted', () => {
      const obj = { a: 1, b: 2 }
      const result = omit(['a', 'b'], obj)
      expect(result).toEqual({})
    })

    it('should omit specified keys from the object, even though some keys do not exist', () => {
      const obj = { a: 1, b: 2 }
      const result = omit(['a', 'd'], obj)
      expect(result).toEqual({ b: 2 })
    })

    it('should not mutate the original object', () => {
      const obj = { a: 1, b: 2 }
      const result = omit(['b'], obj)
      expect(result).toEqual({ a: 1 })
      expect(obj).toEqual({ a: 1, b: 2 })
    })

    it('should omit key only when its value is one of the values in the tuple [key, valuesForWhichKeyIsRemoved]', () => {
      const obj = { status: 'draft', id: 1 }
      const result = omit([['status', ['draft', 'archived']]], obj)
      expect(result).toEqual({ id: 1 })
    })

    it('should keep key when its value is not in the tuple values (key not removed)', () => {
      const obj = { status: 'published', id: 1 }
      const result = omit([['status', ['draft', 'archived']]], obj)
      expect(result).toEqual({ status: 'published', id: 1 })
    })

    it('should support mixed keys: string (always omit) and tuple (omit only when value is in list)', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(['a', ['b', [2]]], obj)
      expect(result).toEqual({ c: 3 })
    })
  })

  describe('set', () => {
    it('should set a value at the specified path (dot notation)', () => {
      const obj = { a: { b: { c: 3 } } }
      const result = set('a.b.c', 4, obj)
      expect(result).toEqual({ a: { b: { c: 4 } } })
    })

    it('should set a value at the specified path (array of keys)', () => {
      const obj = { a: { b: { c: 3 } } }
      const result = set(['a', 'b', 'c'], 4, obj)
      expect(result).toEqual({ a: { b: { c: 4 } } })
    })

    it('should create nested objects if they do not exist', () => {
      const obj = { a: {} }
      const result = set('a.b.c', 4, obj)
      expect(result).toEqual({ a: { b: { c: 4 } } })
    })

    it('should handle setting a value in an array', () => {
      const arr = [1, 2, { a: 3 }]
      const result = set([2, 'a'], 4, arr)
      expect(result).toEqual([1, 2, { a: 4 }])
    })

    it('should not mutate the original object', () => {
      const obj = { a: { b: { c: 3 } } }
      const result = set('a.b.c', 4, obj)
      expect(result).toEqual({ a: { b: { c: 4 } } })
      expect(obj).toEqual({ a: { b: { c: 3 } } })
    })
  })

  describe('mergeWith', () => {
    it('should merge objects using the custom merge function', () => {
      const customMergeFn = (objValue: unknown, srcValue: unknown) => (Array.isArray(objValue) ? objValue.concat(srcValue) : undefined)
      const obj1 = { a: [1], b: 2 }
      const obj2 = { a: [2], b: 3 }
      const result = mergeWith(customMergeFn, obj1, obj2)
      expect(result).toEqual({ a: [1, 2], b: 3 })
    })

    it('should return source if target is not a record', () => {
      const customMergeFn = () => undefined
      const target = null
      const source = { a: 1 }
      const result = mergeWith(customMergeFn, target, source)
      expect(result).toEqual(source)
    })

    it('should return source if source is not a record', () => {
      const customMergeFn = () => undefined
      const target = { a: 1 }
      const source = null
      const result = mergeWith(customMergeFn, target, source)
      expect(result).toEqual(source)
    })

    it('should not mutate the original target object', () => {
      const customMergeFn = () => undefined
      const target = { a: 1, b: 2 }
      const source = { b: 3 }
      const result = mergeWith(customMergeFn, target, source)
      expect(result).toEqual({ a: 1, b: 3 })
      expect(target).toEqual({ a: 1, b: 2 })
    })

    describe('mergeWith (using current customizer)', () => {
      const customizer = (objValue: unknown, srcValue: unknown) => {
        if (Array.isArray(objValue)) {
          return srcValue
        }
      }

      it('should replace arrays in target with arrays in source', () => {
        const obj1 = { a: [1, 2], b: 3 }
        const obj2 = { a: [3, 4], b: 4 }
        const result = mergeWith(customizer, obj1, obj2)
        expect(result).toEqual({ a: [3, 4], b: 4 })
      })

      it('should merge non-array properties normally', () => {
        const obj1 = { a: { b: 2 }, c: 3 }
        const obj2 = { a: { d: 4 }, c: 5 }
        const result = mergeWith(customizer, obj1, obj2)
        expect(result).toEqual({ a: { b: 2, d: 4 }, c: 5 })
      })

      it('should add new properties from source to target', () => {
        const obj1 = { a: 1 }
        const obj2 = { b: [1, 2, 3] }
        const result = mergeWith(customizer, obj1, obj2)
        expect(result).toEqual({ a: 1, b: [1, 2, 3] })
      })

      it('should not mutate the original objects', () => {
        const obj1 = { a: [1, 2], b: { c: 3 } }
        const obj2 = { a: [3, 4], b: { d: 4 } }
        const result = mergeWith(customizer, obj1, obj2)
        expect(result).toEqual({ a: [3, 4], b: { c: 3, d: 4 } })
        expect(obj1).toEqual({ a: [1, 2], b: { c: 3 } })
        expect(obj2).toEqual({ a: [3, 4], b: { d: 4 } })
      })

      it('should return source if target is not a record', () => {
        const target = null
        const source = { a: [1, 2, 3] }
        const result = mergeWith(customizer, target, source)
        expect(result).toEqual(source)
      })

      it('should return source if source is not a record', () => {
        const target = { a: [1, 2, 3] }
        const source = null
        const result = mergeWith(customizer, target, source)
        expect(result).toEqual(source)
      })
    })
  })

  // Tests for isEqual function
  describe('isEqual', () => {
    it('should return true for identical primitives', () => {
      expect(isEqual(1, 1)).toBe(true)
      expect(isEqual('string', 'string')).toBe(true)
      expect(isEqual(true, true)).toBe(true)
    })

    it('should return false for different primitives', () => {
      expect(isEqual(1, 2)).toBe(false)
      expect(isEqual('string', 'different')).toBe(false)
      expect(isEqual(true, false)).toBe(false)
    })

    it('should return true for deep equal objects', () => {
      const obj1 = { a: { b: 2 }, c: 3 }
      const obj2 = { a: { b: 2 }, c: 3 }
      expect(isEqual(obj1, obj2)).toBe(true)
    })

    it('should return false for objects with different structures', () => {
      const obj1 = { a: { b: 2 }, c: 3 }
      const obj2 = { a: { b: 2 }, d: 4 }
      expect(isEqual(obj1, obj2)).toBe(false)
    })

    it('should return false for objects with different values', () => {
      const obj1 = { a: { b: 2 }, c: 3 }
      const obj2 = { a: { b: 3 }, c: 3 }
      expect(isEqual(obj1, obj2)).toBe(false)
    })

    it('should return true for deep equal arrays', () => {
      const arr1 = [1, { a: 2 }, [3, 4]]
      const arr2 = [1, { a: 2 }, [3, 4]]
      expect(isEqual(arr1, arr2)).toBe(true)
    })

    it('should return false for arrays with different values', () => {
      const arr1 = [1, { a: 2 }, [3, 4]]
      const arr2 = [1, { a: 3 }, [3, 4]]
      expect(isEqual(arr1, arr2)).toBe(false)
    })
  })
})
