export type CanvasSize = {
  realWidth: number
  realHeight: number
  width: number
  height: number
  scaleRatio: number
}

export type Size = 'infinite' | 'fixed'

/**
 * How the canvas follows the size of its container. The first four keep the logical size, width×height, and show the
 * whole drawing, its width following the container:
 * - 'scaleDown': at most width pixels wide, scaled down in a narrower container
 * - 'scale': as wide as the container, scaled up or down
 * - 'scaleUp': at least width pixels wide, scaled up in a wider container
 * - 'none': always width×height pixels
 *
 * 'extend' fills the container at the scale 1: the visible area of the drawing follows the container
 */
export type Resize = 'scaleDown' | 'scale' | 'scaleUp' | 'none' | 'extend'
