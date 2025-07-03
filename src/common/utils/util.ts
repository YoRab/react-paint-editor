const idCounter: Record<string, number> = {}

export const uniqueId = (prefix = ''): string => {
  if (!idCounter[prefix]) {
    idCounter[prefix] = 0
  }

  const id = ++idCounter[prefix]

  return `${prefix}${id}`
}

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max))

export const isMacOs = (): boolean => (typeof navigator === 'undefined' ? false : navigator.userAgent.includes('Macintosh'))
