import { clamp } from '@canvas/utils/util'

export const compact = <T>(array: (T | undefined | null)[]): T[] => {
  return array.filter((item): item is T => item !== undefined && item !== null)
}

/** Copy of the array with the items inserted at the index, kept inside the array */
export const insertAt = <T>(array: readonly T[], index: number, ...items: T[]): T[] => {
  const position = clamp(Math.round(index), 0, array.length)
  return [...array.slice(0, position), ...items, ...array.slice(position)]
}

export const moveItemPosition = <T>(array: T[], positionToMove: number, positionToEnd: number): T[] => {
  if (positionToMove < 0 || positionToEnd < 0 || positionToMove > array.length - 1 || positionToEnd > array.length - 1) return array
  if (positionToMove < positionToEnd) {
    return [
      ...array.slice(0, positionToMove),
      ...array.slice(positionToMove + 1, positionToEnd + 1),
      array[positionToMove],
      ...array.slice(positionToEnd + 1, array.length)
    ] as T[]
  }

  return [
    ...array.slice(0, positionToEnd),
    array[positionToMove],
    ...array.slice(positionToEnd, positionToMove),
    ...array.slice(positionToMove + 1, array.length)
  ] as T[]
}
