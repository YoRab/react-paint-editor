const idCounter: Record<string, number> = {}

export const uniqueId = (prefix = '') => {
  if (!idCounter[prefix]) {
    idCounter[prefix] = 0
  }

  const id = ++idCounter[prefix]

  return `${prefix}${id}`
}

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max))
