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
  visible?: boolean
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
}

export type Rect = StyledShape & {
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
export type DrawableRect = Rect & Drawable & { type: ShapeEnum.rect }
export type DrawableSquare = Square & Drawable & { type: ShapeEnum.square }
export type DrawablePictureJson = Picture & Drawable & { type: ShapeEnum.picture }
export type DrawablePicture = DrawablePictureJson & { img: HTMLImageElement }
export type DrawableText = Text & Drawable & { type: ShapeEnum.text }
export type DrawableLine = Line & Drawable & { type: ShapeEnum.line }
export type DrawablePolygon = Polygon & Drawable & { type: ShapeEnum.polygon }
export type DrawableCurve = Curve & Drawable & { type: ShapeEnum.curve }
export type DrawableBrush = Brush & Drawable & { type: ShapeEnum.brush }
export type DrawableCircle = Circle & Drawable & { type: ShapeEnum.circle }
export type DrawableEllipse = Ellipse & Drawable & { type: ShapeEnum.ellipse }

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
