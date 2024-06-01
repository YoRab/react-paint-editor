export const GridValues = {
  none: 0,
  small: 10,
  medium: 20,
  large: 40
} as const

export type GridLabelType = keyof typeof GridValues
