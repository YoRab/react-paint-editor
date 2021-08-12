type Shape = {
  filled?: boolean
}

export type Point = [number, number]

type Drawable = {
  id: string
  translation: Point
  rotation: number
}

export type Rect = Shape & {
  x: number
  y: number
  width: number
  height: number
}

export type Line = Shape & {
  points: [Point, Point]
}

export type Polygon = Shape & {
  points: Point[]
}

export type Circle = Shape & {
  x: number
  y: number
  radius: number
}

export type Ellipse = Shape & {
  x: number
  y: number
  radiusX: number
  radiusY: number
}
export type RectDrawable = Rect & Drawable & { type: 'rect' }
export type LineDrawable = Line & Drawable & { type: 'line' }
export type PolygonDrawable = Polygon & Drawable & { type: 'polygon' }
export type CircleDrawable = Circle & Drawable & { type: 'circle' }
export type EllipseDrawable = Ellipse & Drawable & { type: 'ellipse' }

export type ShapeDrawable =
  | RectDrawable
  | LineDrawable
  | PolygonDrawable
  | CircleDrawable
  | EllipseDrawable
