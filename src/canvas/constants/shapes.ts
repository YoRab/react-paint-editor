import type { Point, ShapeType, StyleShape } from '@canvas/types/Shapes'

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

export const SHAPES_WITH_ROTATION = ['rect', 'square', 'circle', 'ellipse', 'picture', 'text', 'triangle', 'brush', 'group']
export const SHAPES_KEEPING_RATIO = ['square', 'circle', 'picture', 'text']

/** Style fields of the font of a text: its font size is fitted to its width when they change */
export const FONT_STYLE_FIELDS: (keyof StyleShape)[] = ['fontFamily', 'fontBold', 'fontItalic']

/** Style fields which only apply to some types of shapes, with these types. A field which is not listed applies to all of them */
export const STYLE_FIELDS_SHAPE_TYPES: Partial<Record<keyof StyleShape, readonly ShapeType[]>> = {
  ...Object.fromEntries(FONT_STYLE_FIELDS.map((field): [keyof StyleShape, readonly ShapeType[]] => [field, ['text']])),
  lineCap: ['line', 'brush', 'polygon', 'curve'],
  lineJoin: ['rect', 'square', 'polygon', 'brush'],
  cornerRadius: ['rect', 'square', 'picture', 'polygon'],
  textAlign: ['text']
}

/** Settings of the tools which give a field of their new shapes instead of a style field */
export const TOOL_SHAPE_FIELDS: readonly string[] = ['fontSize']

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
