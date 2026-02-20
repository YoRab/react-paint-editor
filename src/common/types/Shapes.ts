import type { ShapeTypeArray } from '../../canvas/constants/shapes'

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
  fillColor?: string
  opacity?: number
  strokeColor?: string
  lineWidth?: number
  lineDash?: number
  lineArrow?: number
  lineCap?: CanvasLineCap
  closedPoints?: number
  fontFamily?: string
  fontItalic?: boolean
  fontBold?: boolean
}

export type SelectionDefaultType = {
  border: Path2D
  line: Path2D | undefined
  shapePath: Path2D | undefined
  anchors: Path2D[]
}

export type SelectionLinesType = {
  border: Path2D
  shapePath: Path2D | undefined
  anchors: Path2D[]
}

type GenericDrawableShape = {
  rotation?: number
  toolId?: string
  visible?: boolean
  locked?: boolean
  style?: StyleShape | undefined
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
  path?: Path2D | undefined
} & DrawableShape<T> &
  (
    | {
        type: 'line'
        selection?: SelectionLinesType | undefined
        arrows?: TriangleEntity[]
      }
    | {
        type: 'polygon' | 'curve'
        selection?: SelectionLinesType | undefined
      }
    | {
        type: 'text' | 'picture' | 'rect' | 'square' | 'circle' | 'ellipse' | 'group' | 'brush'
        selection?: SelectionDefaultType | undefined
      }
  )

export type StateData = {
  shapes?: DrawableShape[]
  config?: {
    width: number
    height: number
  }
}

export type SelectionType = ShapeEntity
