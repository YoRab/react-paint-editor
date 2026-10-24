const idCounter: Record<string, number> = {}

export const uniqueId = (prefix = ''): string => {
  if (!idCounter[prefix]) {
    idCounter[prefix] = 0
  }

  const id = ++idCounter[prefix]

  return `${prefix}${id}`
}

let shapeIdCounter = 0

/**
 * Id of a new shape. It is random, so that it does not collide with the ids of the shapes saved in another session:
 * crypto.randomUUID only exists in secure contexts, otherwise the time, a random part and a counter are used.
 */
export const createShapeId = (type: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${++shapeIdCounter}`
  return `${type}_${random}`
}

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max))

export const isMacOs = (): boolean => (typeof navigator === 'undefined' ? false : navigator.userAgent.includes('Macintosh'))

/**
 * Value of a style property that a CSS variable set on any parent element overrides, without !important.
 * The canvas never sets these variables itself, otherwise it would hide the ones of the parents.
 * Without fallback, the property falls back to its inherited or initial value when the variable is not set.
 */
export const cssVar = (name: `--${string}`, fallback?: string | number): string =>
  fallback === undefined ? `var(${name})` : `var(${name}, ${fallback})`
