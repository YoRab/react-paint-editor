// Generic helpers also present in the canvas: the editor only depends on the public API of the canvas, like a custom editor

const idCounter: Record<string, number> = {}

export const uniqueId = (prefix = ''): string => {
  if (!idCounter[prefix]) {
    idCounter[prefix] = 0
  }

  const id = ++idCounter[prefix]

  return `${prefix}${id}`
}

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max))

export const compact = <T>(array: (T | undefined | null)[]): T[] => {
  return array.filter((item): item is T => item !== undefined && item !== null)
}

/** Shallow merges the options into the defaults, ignoring the options set to undefined */
export const withDefaults = <T extends object>(defaults: T, options: object | undefined): T =>
  ({ ...defaults, ...Object.fromEntries(Object.entries(options ?? {}).filter(([, value]) => value !== undefined)) }) as T
