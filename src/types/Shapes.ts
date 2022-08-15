import { ShapeTypeArray } from 'constants/shapes'

export type ShapeType = typeof ShapeTypeArray[number]
export type Point = [number, number]

export type StyledShape = {
  visible?: boolean
  locked?: boolean
  style?: {
    fillColor?: string
    globalAlpha?: number
    strokeColor?: string
    lineWidth?: number
    lineDash?: number
    lineArrow?: number
    pointsCount?: number
    fontFamily?: string
    fontItalic?: boolean
    fontBold?: boolean
  }
}

type Drawable = {
  id: string
  toolId?: string
  rotation: number
}

export type Rect = StyledShape & {
  x: number
  y: number
  width: number
  height: number
}

export type Square = Rect

export type StoredPicture = Rect & {
  src: string
}

export type Picture = StoredPicture & {
  img: HTMLImageElement
}

export type Text = Rect & {
  value: string[]
  fontSize: number
}

export type Line = StyledShape & {
  points: [Point, Point]
}

export type Triangle = StyledShape & {
  points: [Point, Point, Point]
}

export type Polygon = StyledShape & {
  points: Point[]
}

export type Curve = StyledShape & {
  points: Point[]
}

export type Brush = StyledShape & {
  points: Point[][]
}

export type Circle = StyledShape & {
  x: number
  y: number
  radius: number
}

export type Ellipse = StyledShape & {
  x: number
  y: number
  radiusX: number
  radiusY: number
}
export type DrawableRect = Rect & Drawable & { type: 'rect'; path?: Path2D }
export type DrawableSquare = Square & Drawable & { type: 'square' }
export type DrawablePictureJson = StoredPicture & Drawable & { type: 'picture' }
export type DrawablePicture = Picture & Drawable & { type: 'picture' }
export type DrawableText = Text & Drawable & { type: 'text' }
export type DrawableLine = Line & Drawable & { type: 'line' }
export type DrawablePolygon = Polygon & Drawable & { type: 'polygon' }
export type DrawableCurve = Curve & Drawable & { type: 'curve' }
export type DrawableBrush = Brush & Drawable & { type: 'brush'; path?: Path2D }
export type DrawableCircle = Circle & Drawable & { type: 'circle' }
export type DrawableEllipse = Ellipse & Drawable & { type: 'ellipse' }

export type DrawableShape =
  | DrawableRect
  | DrawableSquare
  | DrawablePicture
  | DrawableText
  | DrawableLine
  | DrawablePolygon
  | DrawableCurve
  | DrawableBrush
  | DrawableCircle
  | DrawableEllipse

export type DrawableShapeJson = { translation?: Point } & (
  | DrawableRect
  | DrawableSquare
  | DrawablePictureJson
  | DrawableText
  | DrawableLine
  | DrawableCurve
  | DrawablePolygon
  | DrawableBrush
  | DrawableCircle
  | DrawableEllipse
)

export type ExportDataType = {
  shapes: DrawableShapeJson[]
  config?: {
    width: number
    height: number
  }
}
