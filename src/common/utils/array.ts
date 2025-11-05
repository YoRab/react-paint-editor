export const compact = <T>(array: (T | undefined | null)[]): T[] => {
  return array.filter((item): item is T => item !== undefined && item !== null)
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
