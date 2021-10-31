export type StyledShape = {
  style?: {
    fillColor?: string
    strokeColor?: string
    lineWidth?: number
  }
}

export enum ShapeEnum {
  'rect' = 'rect',
  'line' = 'line',
  'polygon' = 'polygon',
  'circle' = 'circle',
  'ellipse' = 'ellipse',
  'picture' = 'picture'
}

export enum ToolEnum {
  selection = 'selection',
  undo = 'undo',
  redo = 'redo',
  clear = 'clear',
  save = 'save',
  move = 'move'
}

export type ToolsType = ShapeEnum | ToolEnum

export type Point = [number, number]

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
export type DrawableRect = Rect & Drawable & { type: ShapeEnum.rect }
export type DrawablePicture = Picture & Drawable & { type: ShapeEnum.picture }
export type DrawableLine = Line & Drawable & { type: ShapeEnum.line }
export type DrawablePolygon = Polygon & Drawable & { type: ShapeEnum.polygon }
export type DrawableCircle = Circle & Drawable & { type: ShapeEnum.circle }
export type DrawableEllipse = Ellipse & Drawable & { type: ShapeEnum.ellipse }

export type DrawableShape =
  | DrawableRect
  | DrawablePicture
  | DrawableLine
  | DrawablePolygon
  | DrawableCircle
  | DrawableEllipse
