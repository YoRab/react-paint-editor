export type StyledShape = {
  style?: {
    fillColor?: string
    strokeColor?: string
    lineWidth?: number
  }
}

export enum ShapeType {
  'rect' = 'rect',
  'line' = 'line',
  'polygon' = 'polygon',
  'circle' = 'circle',
  'ellipse' = 'ellipse',
  'picture' = 'picture'
}

export type Point = [number, number]

type Drawable = {
  id: string
  translationOnceRotated: Point
  translationBeforeRotation: Point
  rotation: number
}

export type Rect = StyledShape & {
  x: number
  y: number
  width: number
  height: number
}

export type Picture = Rect & {
  img: CanvasImageSource
}

export type Line = StyledShape & {
  points: [Point, Point]
}

export type Polygon = StyledShape & {
  points: Point[]
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
export type DrawableRect = Rect & Drawable & { type: ShapeType.rect }
export type DrawablePicture = Picture & Drawable & { type: ShapeType.picture }
export type DrawableLine = Line & Drawable & { type: ShapeType.line }
export type DrawablePolygon = Polygon & Drawable & { type: ShapeType.polygon }
export type DrawableCircle = Circle & Drawable & { type: ShapeType.circle }
export type DrawableEllipse = Ellipse & Drawable & { type: ShapeType.ellipse }

export type DrawableShape =
  | DrawableRect
  | DrawablePicture
  | DrawableLine
  | DrawablePolygon
  | DrawableCircle
  | DrawableEllipse
