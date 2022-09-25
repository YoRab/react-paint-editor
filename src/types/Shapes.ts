import { ShapeTypeArray } from 'constants/shapes'

export type ShapeType = typeof ShapeTypeArray[number]
export type Point = [number, number]

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Square = Rect

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
}

export type Curve = {
  points: Point[]
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

export type Shape =
  | Rect
  | Square
  | Picture
  | Text
  | Line
  | Polygon
  | Curve
  | Brush
  | Circle
  | Ellipse
  | Triangle

export type StyleShape = {
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

export type DrawableShape<T extends ShapeType = ShapeType> = {
  visible?: boolean
  locked?: boolean
  rotation: number
  style?: StyleShape
} & (T extends 'line'
  ? Line & { type: 'line'; path?: Path2D; arrows?: DrawableShape<'triangle'>[] }
  : T extends 'picture'
  ? Picture & { type: 'picture'; img: HTMLImageElement }
  : T extends 'text'
  ? Text & { type: 'text' }
  : T extends 'rect'
  ? Rect & { type: 'rect'; path?: Path2D }
  : T extends 'square'
  ? Square & { type: 'square'; path?: Path2D }
  : T extends 'circle'
  ? Circle & { type: 'circle'; path?: Path2D }
  : T extends 'ellipse'
  ? Ellipse & { type: 'ellipse'; path?: Path2D }
  : T extends 'triangle'
  ? Triangle & { type: 'triangle'; path?: Path2D }
  : T extends 'polygon'
  ? Polygon & { type: 'polygon'; path?: Path2D }
  : T extends 'curve'
  ? Curve & { type: 'curve'; path?: Path2D }
  : T extends 'brush'
  ? Brush & { type: 'brush'; path?: Path2D }
  : never)

// type Drawable = {
//   id: string
//   toolId?: string
// }

// export type Picture = StoredPicture & {
//   img: HTMLImageElement
// }

// export type DrawableRect = Rect & { path?: Path2D }
// export type DrawableSquare = Square & { path?: Path2D }
// export type DrawablePictureJson = StoredPicture & Drawable & { img: HTMLImageElement}
// export type DrawablePicture = Picture & Drawable & { img: HTMLImageElement }
// export type DrawableText = Text & Drawable
// export type DrawablePolygon = Polygon & Drawable & { path?: Path2D }
// export type DrawableCurve = Curve & Drawable & { path?: Path2D }
// export type DrawableBrush = Brush & Drawable & { path?: Path2D }
// export type DrawableCircle = Circle & Drawable & { path?: Path2D }
// export type DrawableEllipse = Ellipse & Drawable & { path?: Path2D }
// export type DrawableTriangle = Triangle & Drawable & { path?: Path2D }
// export type DrawableLine = Line & Drawable & { path?: Path2D; arrows?: DrawableTriangle[] }

// export type DrawableShape =
//   | DrawableRect
//   | DrawableSquare
//   | DrawablePicture
//   | DrawableText
//   | DrawableLine
//   | DrawablePolygon
//   | DrawableCurve
//   | DrawableBrush
//   | DrawableCircle
//   | DrawableEllipse

export type DrawableShapeJson<T extends ShapeType = ShapeType> = DrawableShape<T> & {
  translation?: Point
}
//  & (
//   | DrawableRect
//   | DrawableSquare
//   // | DrawablePictureJson
//   | DrawableText
//   | DrawableLine
//   | DrawableCurve
//   | DrawablePolygon
//   | DrawableBrush
//   | DrawableCircle
//   | DrawableEllipse
// )

export type ShapeEntity<T extends Exclude<ShapeType, 'triangle'> = Exclude<ShapeType, 'triangle'>> =
  {
    id: string
    toolId?: string
  } & DrawableShape<T>

export type ExportDataType = {
  shapes: DrawableShapeJson[]
  config?: {
    width: number
    height: number
  }
}
