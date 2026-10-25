import type { ShapeTypeArray } from '@canvas/constants/shapes'

export type ShapeType = (typeof ShapeTypeArray)[number]
export type Point = [number, number]

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Picture = Rect & {
  src: string
}

export type Text = Rect & {
  value: string[]
  fontSize: number
}

export type TextAlign = 'left' | 'center' | 'right'

export type Line = {
  points: readonly [Point, Point]
}

export type Triangle = {
  points: [Point, Point, Point]
}

export type Polygon = {
  points: Point[]
  tempPoint?: Point | undefined
}

export type Curve = {
  points: Point[]
  tempPoint?: Point | undefined
}

export type Brush = {
  points: Point[][]
}

export type Circle = {
  x: number
  y: number
  radius: number
}

export type Ellipse = {
  x: number
  y: number
  radiusX: number
  radiusY: number
}

export type StyleShape = {
  /** Fill of a shape, and background of a text, which fills its selection frame: its box with the selection padding */
  fillColor?: string
  opacity?: number
  strokeColor?: string
  lineWidth?: number
  lineDash?: number
  lineArrow?: number
  /** Ends of the stroke of a line, a brush, an open polygon or an open curve, and of its dashes: 'round' by default */
  lineCap?: CanvasLineCap
  /** Corners of the stroke of a rectangle, a square, a polygon or a brush: 'round' by default */
  lineJoin?: CanvasLineJoin
  /**
   * Radius of the corners of a rectangle, a square, a picture or a polygon, in the units of the drawing: 0 by default. It
   * is drawn as large as the sides allow, at most half of the smallest side of a rectangle, and stays the same when the
   * shape is resized. The ends of an open polygon stay sharp
   */
  cornerRadius?: number
  closedPoints?: number
  /**
   * Alignment of the lines of a text in its box: 'left' by default. When its content changes, the box keeps the side of
   * its alignment, or its middle when centered
   */
  textAlign?: TextAlign
  /**
   * Height of the lines of a text, in font sizes: 1 by default. Like in CSS, the letters are in the middle of their line,
   * and the box of the text is as high as its lines. A value which is not positive gives the default one
   */
  lineHeight?: number
  fontFamily?: string
  fontItalic?: boolean
  fontBold?: boolean
  /** Lines under and through the lines of a text, of its color */
  fontUnderline?: boolean
  fontStrikethrough?: boolean
  /** Outline around the letters of a text, none by default */
  outlineColor?: string
  /** Thickness of the outline of a text around its letters, in the units of the drawing: 2 by default */
  outlineWidth?: number
}

/** Data of the application attached to a shape: it is not drawn, and is kept in the history, the copies and the exported data */
export type ShapeData = Record<string, unknown>

type GenericDrawableShape = {
  /** Kept when the shape is exported and loaded again. A new id is created when it is missing or already used */
  id?: string
  rotation?: number
  toolId?: string
  visible?: boolean
  locked?: boolean
  style?: StyleShape | undefined
  /** Free data of the application, which must be serializable in JSON. A patch replaces it as a whole */
  data?: ShapeData | undefined
} & (
  | (Line & {
      type: 'line'
    })
  | (Picture & {
      type: 'picture'
      img: HTMLImageElement
      flipX?: boolean
      flipY?: boolean
      ratio?: number
    })
  | (Text & {
      type: 'text'
      flipX?: boolean
      flipY?: boolean
      ratio?: number
    })
  | (Rect & {
      type: 'rect'
    })
  | (Rect & {
      type: 'square'
    })
  | (Circle & {
      type: 'circle'
    })
  | (Ellipse & {
      type: 'ellipse'
    })
  | (Triangle & {
      type: 'triangle'
    })
  | (Polygon & {
      type: 'polygon'
    })
  | (Curve & {
      type: 'curve'
    })
  | (Brush & {
      type: 'brush'
      scaleX?: number
      scaleY?: number
    })
  | (Rect & {
      type: 'group'
      shapes: ShapeEntity[]
    })
)

export type DrawableShape<T extends ShapeType = ShapeType> = GenericDrawableShape & {
  type: T
}

export type ExportedDrawableShape<T extends ShapeType = ShapeType> = T extends 'picture' ? Omit<DrawableShape<'picture'>, 'img'> : DrawableShape<T>

export type TriangleEntity = DrawableShape<'triangle'> & {
  path: Path2D
  computed: {
    borders: Rect
    outerBorders: Rect
    center: Point
    boundingBox: Rect
  }
}

export type ShapeEntity<T extends Exclude<ShapeType, 'triangle'> = Exclude<ShapeType, 'triangle'>> = {
  id: string
  computed: {
    borders: Rect
    outerBorders: Rect
    center: Point
    boundingBox: Rect
  }
  path: Path2D
} & DrawableShape<T> &
  (
    | {
        type: 'line'
        arrows?: TriangleEntity[]
      }
    | {
        type: Exclude<ShapeType, 'line' | 'triangle'>
      }
  )

/** A shape as exported: without the computed data, and with its id */
export type ExportedShape = ExportedDrawableShape & { id: string }

/** Types of the shapes which can be created and edited: triangles and groups are only built by the canvas */
export type EditableShapeType = Exclude<ShapeType, 'triangle' | 'group'>

/** A text can be given without its size: it is computed from its font size, or from its width */
export type TextShapeInput = Omit<ExportedDrawableShape<'text'>, 'width' | 'height' | 'fontSize'> &
  Partial<Pick<DrawableShape<'text'>, 'width' | 'height' | 'fontSize'>>

/**
 * A shape given by the consumer, to create or to load it. Triangles and groups are refused by addShapes and left out
 * when loading: they are accepted by the type so that data typed as DrawableShape can be given
 */
export type ShapeInput = ExportedDrawableShape | TextShapeInput

type DistributivePatch<T> = T extends unknown ? { id: string } & Partial<Omit<T, 'id' | 'type' | 'img'>> : never

/** Fields of a shape to update, found by its id. Its type cannot change, and its style is merged with the current one */
export type ShapePatch = DistributivePatch<ExportedDrawableShape<EditableShapeType>>

export type StateData = {
  shapes?: ExportedShape[]
  config?: {
    width: number
    height: number
  }
}

export type SelectionType = ShapeEntity
