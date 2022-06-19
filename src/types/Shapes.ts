export enum ShapeEnum {
  'brush' = 'brush',
  'rect' = 'rect',
  'square' = 'square',
  'line' = 'line',
  'polygon' = 'polygon',
  'circle' = 'circle',
  'curve' = 'curve',
  'ellipse' = 'ellipse',
  'picture' = 'picture',
  'text' = 'text'
}

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
  translation: Point
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
export type DrawableRect = Rect & Drawable & { toolId: string; type: ShapeEnum.rect }
export type DrawableSquare = Square & Drawable & { toolId: string; type: ShapeEnum.square }
export type DrawablePictureJson = StoredPicture &
  Drawable & { toolId: string; type: ShapeEnum.picture }
export type DrawablePicture = Picture & Drawable & { toolId: string; type: ShapeEnum.picture }
export type DrawableText = Text & Drawable & { toolId: string; type: ShapeEnum.text }
export type DrawableLine = Line & Drawable & { toolId: string; type: ShapeEnum.line }
export type DrawablePolygon = Polygon & Drawable & { toolId: string; type: ShapeEnum.polygon }
export type DrawableCurve = Curve & Drawable & { toolId: string; type: ShapeEnum.curve }
export type DrawableBrush = Brush & Drawable & { toolId: string; type: ShapeEnum.brush }
export type DrawableCircle = Circle & Drawable & { toolId: string; type: ShapeEnum.circle }
export type DrawableEllipse = Ellipse & Drawable & { toolId: string; type: ShapeEnum.ellipse }

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

export type DrawableShapeJson =
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

export type ExportDataType = {
  shapes: DrawableShapeJson[]
  config?: {
    width: number
    height: number
  }
}
