import type { Point } from '@common/types/Shapes'

export const SELECTION_DEFAULT_PADDING = 0
export const SELECTION_DEFAULT_WIDTH = 2
export const SELECTION_DEFAULT_COLOR = 'blue'
export const SELECTION_ANCHOR_SIZE = 14
export const SELECTION_ROTATED_ANCHOR_POSITION = 16
export const SELECTION_RESIZE_ANCHOR_POSITIONS: Point[] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [1, 0.5],
  [1, 1],
  [0.5, 1],
  [0, 1],
  [0, 0.5]
]

export const ShapeTypeArray = [
  'brush',
  'rect',
  'square',
  'line',
  'polygon',
  'circle',
  'curve',
  'ellipse',
  'picture',
  'text',
  'triangle',
  'group'
] as const

export const SHAPES_WITH_ROTATION = ['rect', 'square', 'circle', 'ellipse', 'picture', 'text', 'triangle', 'brush', 'group']
export const SHAPES_KEEPING_RATIO = ['square', 'circle', 'picture', 'text']
