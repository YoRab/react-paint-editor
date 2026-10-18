export const omit = <T extends Record<string, unknown>>(keys: (string | [string, unknown[]])[], obj: T): T => {
  const result = { ...obj }

  for (const key of keys) {
    if (Array.isArray(key)) {
      if (key[1].includes(result[key[0]])) {
        delete result[key[0]]
      }
    } else {
      delete result[key]
    }
  }

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
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (source.hasOwnProperty(key)) {
      // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
      if (merged.hasOwnProperty(key)) {
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

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (const key of keysA) {
    //@ts-expect-error unchecked access is intentional
    if (!keysB.includes(key) || !isEqual(a[key], b[key])) {
      return false
    }
  }

  return true
}
