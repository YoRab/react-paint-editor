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

export const SHAPES_WITH_ROTATION = ['rect', 'square', 'circle', 'ellipse', 'picture', 'text', 'brush', 'group']
export const SHAPES_KEEPING_RATIO = ['square', 'circle', 'picture', 'text']

/** Style fields of the font of a text: its font size is fitted to its width when they change */
export const FONT_STYLE_FIELDS: (keyof StyleShape)[] = ['fontFamily', 'fontBold', 'fontItalic']

/** Style fields of the texts only */
const TEXT_STYLE_FIELDS: (keyof StyleShape)[] = [
  ...FONT_STYLE_FIELDS,
  'textAlign',
  'lineHeight',
  'fontUnderline',
  'fontStrikethrough',
  'outlineColor',
  'outlineWidth'
]

/** Style fields of the fills drawn inside the path of a shape: the background of a text stays a solid color */
const FILL_STYLE_FIELDS: (keyof StyleShape)[] = ['fillPattern', 'fillGradient', 'fillColor2', 'fillGradientAngle']

const FILLED_SHAPE_TYPES: readonly ShapeType[] = ['rect', 'square', 'circle', 'ellipse', 'polygon', 'curve']

const withShapeTypes = (fields: (keyof StyleShape)[], types: readonly ShapeType[]) =>
  Object.fromEntries(fields.map((field): [keyof StyleShape, readonly ShapeType[]] => [field, types]))

/** Style fields which only apply to some types of shapes, with these types. A field which is not listed applies to all of them */
export const STYLE_FIELDS_SHAPE_TYPES: Partial<Record<keyof StyleShape, readonly ShapeType[]>> = {
  ...withShapeTypes(TEXT_STYLE_FIELDS, ['text']),
  ...withShapeTypes(FILL_STYLE_FIELDS, FILLED_SHAPE_TYPES),
  lineCap: ['line', 'brush', 'polygon', 'curve'],
  lineJoin: ['rect', 'square', 'polygon', 'brush'],
  cornerRadius: ['rect', 'square', 'picture', 'polygon'],
  arrowStart: ['line', 'polygon', 'curve'],
  arrowEnd: ['line', 'polygon', 'curve'],
  arrowSize: ['line', 'polygon', 'curve']
}

/** Settings of the tools which give a field of their new shapes instead of a style field */
export const TOOL_SHAPE_FIELDS: readonly string[] = ['fontSize']

export const ShapeTypeArray = ['brush', 'rect', 'square', 'line', 'polygon', 'circle', 'curve', 'ellipse', 'picture', 'text', 'group'] as const
