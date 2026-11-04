import { isValidElement } from 'react'

export const omit = <T extends Record<string, unknown>>(keys: string[], obj: T): T => {
  const result = { ...obj }
  for (const key of keys) delete result[key]
  return result
}

// biome-ignore lint/suspicious/noExplicitAny: any is used to allow flexibility in the type of the value
export const set = <T extends Record<string, any> | unknown[]>(path: string | number | (string | number)[], value: unknown, obj: T): T => {
  const result = (Array.isArray(obj) ? [...obj] : { ...obj }) as T
  const chunks = Array.isArray(path) ? path : typeof path === 'string' ? path.split('.') : [path]
  // biome-ignore lint/suspicious/noExplicitAny: any is used to allow flexibility in the type of the value
  chunks.reduce<Record<string, any>>((acc, chunk, index) => {
    acc[chunk] = isRecord(acc[chunk])
      ? { ...acc[chunk] }
      : Array.isArray(acc[chunk])
        ? [...acc[chunk]]
        : acc[chunk] === undefined || acc[chunk] === null
          ? {}
          : acc[chunk]
    if (index === chunks.length - 1) acc[chunk] = value
    return acc[chunk]
  }, result) as T
  return result
}

/** Copy of the object without its entries set to undefined */
export const omitUndefined = <T extends object>(obj: T): T => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T

/** Shallow merges the options into the defaults, ignoring the options set to undefined */
export const withDefaults = <T extends object>(defaults: T, options: object | undefined): T => ({ ...defaults, ...omitUndefined(options ?? {}) }) as T

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && !Array.isArray(value) && value !== null
}

/** Customizer of mergeWith which replaces the arrays instead of merging them */
export const replaceArrays = (objValue: unknown, srcValue: unknown) => (Array.isArray(objValue) ? srcValue : undefined)

export const mergeWith = (
  customMergeFn: (objValue: unknown, srcValue: unknown, key: string) => unknown,
  target: unknown,
  source: unknown
): unknown => {
  if (!isRecord(target) || !isRecord(source)) {
    return source
  }

  const merged: Record<string, unknown> = { ...target }

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      if (Object.hasOwn(merged, key)) {
        merged[key] = customMergeFn(merged[key], source[key], key) ?? mergeWith(customMergeFn, merged[key], source[key])
      } else {
        merged[key] = source[key]
      }
    }
  }

  return merged
}

export const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }

  // by index: Object.keys would build an array of strings for each one, like each point of a brush
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i] && !isEqual(a[i], b[i])) return false
    }
    return true
  }

  // React elements, like the icons of the tools: their owner and debug fields are fibers and stacks, never compared
  if (isValidElement(a) || isValidElement(b)) {
    return isValidElement(a) && isValidElement(b) && a.type === b.type && a.key === b.key && isEqual(a.props, b.props)
  }

  const keysA = Object.keys(a)

  if (keysA.length !== Object.keys(b).length) {
    return false
  }

  const recordA = a as Record<string, unknown>
  const recordB = b as Record<string, unknown>
  for (const key of keysA) {
    if (!Object.hasOwn(recordB, key)) return false
    if (recordA[key] !== recordB[key] && !isEqual(recordA[key], recordB[key])) return false
  }

  return true
}
