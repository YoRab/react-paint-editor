export enum ShapeEnum {
  'brush' = 'brush',
  'rect' = 'rect',
  'square' = 'square',
  'line' = 'line',
  'polygon' = 'polygon',
  'circle' = 'circle',
  'ellipse' = 'ellipse',
  'picture' = 'picture',
  'text' = 'text'
}

export enum ToolEnum {
  selection = 'selection',
  undo = 'undo',
  redo = 'redo',
  clear = 'clear',
  export = 'export',
  loadFile = 'loadfile',
  saveFile = 'savefile',
  move = 'move'
}

export type ToolsType = ShapeEnum | ToolEnum

export type Point = [number, number]

export type StyledShape = {
  style?: {
    fillColor?: string
    globalAlpha?: number
    strokeColor?: string
    lineWidth?: number
    lineDash?: number
    lineArrow?: number
    pointsCount?: number
    fontFamily?: string
  }
}

type Drawable = {
  id: string
  translation: Point
  rotation: number
  scale: Point
}

export type Rect = StyledShape & {
  x: number
  y: number
  width: number
  height: number
}

export type Square = Rect

export type Picture<T extends HTMLImageElement | string> = Rect & {
  img: T
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
export type DrawableRect = Rect & Drawable & { type: ShapeEnum.rect }
export type DrawableSquare = Square & Drawable & { type: ShapeEnum.square }
export type DrawablePicture<T extends HTMLImageElement | string> = Picture<T> &
  Drawable & { type: ShapeEnum.picture }
export type DrawableText = Text & Drawable & { type: ShapeEnum.text }
export type DrawableLine = Line & Drawable & { type: ShapeEnum.line }
export type DrawablePolygon = Polygon & Drawable & { type: ShapeEnum.polygon }
export type DrawableBrush = Brush & Drawable & { type: ShapeEnum.brush }
export type DrawableCircle = Circle & Drawable & { type: ShapeEnum.circle }
export type DrawableEllipse = Ellipse & Drawable & { type: ShapeEnum.ellipse }

export type DrawableShape =
| DrawableRect
| DrawableSquare
| DrawablePicture<HTMLImageElement>
  | DrawableText
  | DrawableLine
  | DrawablePolygon
  | DrawableBrush
  | DrawableCircle
  | DrawableEllipse

export type DrawableShapeJson =
  | DrawableRect
  | DrawableSquare
  | DrawablePicture<string>
  | DrawableText
  | DrawableLine
  | DrawablePolygon
  | DrawableBrush
  | DrawableCircle
  | DrawableEllipse
