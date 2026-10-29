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

/**
 * Head at an end of a line, or of an open polygon or curve, of the color of its stroke: filled, outlined, or a stroke
 * like an open arrow or a bar across the end. The circles and the bar are centered on the end, the other heads point to it
 */
export type ArrowHead = 'none' | 'triangle' | 'triangleOutline' | 'open' | 'circle' | 'circleOutline' | 'diamond' | 'diamondOutline' | 'bar'

/** A head of a shape as drawn: filled with the color of its stroke, or stroked like it without its dashes */
export type ArrowHeadEntity = {
  path: Path2D
  filled: boolean
}

/**
 * Fill of a shape: a solid fill, or lines drawn inside the shape, of its fill color: lines at 45°, lines across them, or
 * dots. Their thickness and their gap grow with the width of the stroke
 */
export type FillPattern = 'solid' | 'hatch' | 'crossHatch' | 'dots'

/**
 * Gradient of the fill of a shape, from its fill color to its second fill color, in its box: along the angle of the
 * gradient, from the center to the farthest side, or around the center from the angle
 */
export type FillGradient = 'none' | 'linear' | 'radial' | 'conic'

export type StyleShape = {
  /** Fill of a shape, and background of a text, which fills its selection frame: its box with the selection padding */
  fillColor?: string
  /** Pattern of the fill of a rectangle, a square, a circle, an ellipse, a polygon or a curve: 'solid' by default */
  fillPattern?: FillPattern
  /** Gradient of the fill of a rectangle, a square, a circle, an ellipse, a polygon or a curve, or of its pattern: none by default */
  fillGradient?: FillGradient
  /** Color of the end of the gradient of the fill: white by default. It fades out when it is transparent */
  fillColor2?: string
  /**
   * Angle of a linear gradient, and start angle of a conic one, in degrees, clockwise: 0 by default, from the left to
   * the right
   */
  fillGradientAngle?: number
  opacity?: number
  strokeColor?: string
  lineWidth?: number
  lineDash?: number
  /** Heads at the first and the last point of a line, or of an open polygon or curve: none by default */
  arrowStart?: ArrowHead
  arrowEnd?: ArrowHead
  /**
   * Size of the heads, as a multiplier of their default size, which grows with the width of the stroke: 1 by default.
   * A value which is not positive gives the default one
   */
  arrowSize?: number
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
  | {
      /**
       * A group of shapes, moved, turned and resized together. Its rotation is the one of its frame, its style only has an
       * opacity, the one of its shapes drawn together. Hidden or locked, its shapes are hidden or locked with it
       */
      type: 'group'
      /** Its shapes, from the foreground: they keep their own positions and rotations in the drawing */
      shapes: ShapeEntity[]
      /** Name of the group, shown in the layers instead of its id */
      name?: string
    }
)

export type DrawableShape<T extends ShapeType = ShapeType> = GenericDrawableShape & {
  type: T
}

/** A group as exported, with its shapes as exported */
export interface ExportedGroup extends Omit<DrawableShape<'group'>, 'shapes'> {
  shapes: ExportedShape[]
}

export type ExportedDrawableShape<T extends ShapeType = ShapeType> = T extends 'picture'
  ? Omit<DrawableShape<'picture'>, 'img'>
  : T extends 'group'
    ? ExportedGroup
    : DrawableShape<T>

export type ShapeEntity<T extends ShapeType = ShapeType> = {
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
        type: 'line' | 'polygon' | 'curve'
        /** Heads of the ends of the stroke, which is drawn shorter under them */
        arrows?: ArrowHeadEntity[]
      }
    | {
        type: Exclude<ShapeType, 'line' | 'polygon' | 'curve'>
      }
  )

/** A shape as exported: without the computed data, and with its id */
export type ExportedShape = ExportedDrawableShape & { id: string }

/** Types of the shapes which are drawn: the groups hold them */
export type EditableShapeType = Exclude<ShapeType, 'group'>

/** A text can be given without its size: it is computed from its font size, or from its width */
export type TextShapeInput = Omit<ExportedDrawableShape<'text'>, 'width' | 'height' | 'fontSize'> &
  Partial<Pick<DrawableShape<'text'>, 'width' | 'height' | 'fontSize'>>

/** A group given with its shapes, at least 2 of them. Without rotation, it is turned like its shapes when they are all turned the same way */
export type GroupShapeInput = Omit<DrawableShape<'group'>, 'shapes'> & { shapes: ShapeInput[] }

/** A shape given by the consumer, to create or to load it */
export type ShapeInput = ExportedDrawableShape | TextShapeInput | GroupShapeInput

type DistributivePatch<T> = T extends unknown ? { id: string } & Partial<Omit<T, 'id' | 'type' | 'img'>> : never

/**
 * Fields of a group to update: its flags, its data, its name and its opacity. Its shapes change with groupShapes and
 * ungroupShapes, its rotation with rotateShapes
 */
export type GroupPatch = { id: string } & Partial<Pick<DrawableShape<'group'>, 'visible' | 'locked' | 'data'>> & {
    /** A name set to undefined is removed */
    name?: string | undefined
    style?: Pick<StyleShape, 'opacity'>
  }

/** Fields of a shape to update, found by its id. Its type cannot change, and its style is merged with the current one */
export type ShapePatch = DistributivePatch<ExportedDrawableShape<EditableShapeType>> | GroupPatch

export type StateData = {
  shapes?: ExportedShape[]
  config?: {
    width: number
    height: number
  }
}

/**
 * Shapes selected together, framed by the canvas: the selection is not part of the drawing. Its frame is turned like its
 * shapes when they are all turned the same way
 */
export type MultiSelection = {
  /** The ids of its shapes, joined */
  id: string
  type: 'multiSelection'
  shapes: ShapeEntity[]
  rotation: number
  visible: true
  locked: false
  /** The style fields shared by all its shapes */
  style: StyleShape
  computed: ShapeEntity['computed']
  path: Path2D
}

/** The selected shape, or the shapes selected together */
export type SelectionType = ShapeEntity | MultiSelection

/** Frame of shapes resized or flipped together: their selection, or a shape alone */
export type ShapesFrame = Pick<SelectionType, 'rotation' | 'computed'>
