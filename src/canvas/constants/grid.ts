/** Steps of a half turn the rotation takes on the grid: 10° */
export const GRID_ROTATION_STEPS = 18

/** Steps of a half turn the angles take with Shift, of a rotation or of a segment: 15°, like the other drawing tools */
export const SHIFT_ANGLE_STEPS = 12

/** Gaps of the grid offered by the Editor: give one of them to setGridGap. 0 hides the grid */
export const GRID_PRESETS = {
  none: 0,
  small: 10,
  medium: 20,
  large: 40
} as const
