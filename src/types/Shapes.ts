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

export type SettingsOpacity = {
  opacity: {
    min: number
    max: number
    step: number
    default: number
  }
}

export type SettingsStrokeColor = {
  strokeColor: {
    values: string[]
    default: string
  }
}

export type SettingsFillColor = {
  fillColor: {
    values: string[]
    default: string
  }
}

export type SettingsLineWidth = {
  lineWidth: {
    min: number
    max: number
    step: number
    default: number
  }
}

export type SettingsLineDash = {
  lineDash: {
    values: number[]
    default: number
  }
}

export type SettingsLineArrow = {
  lineArrow: {
    values: number[]
    default: number
  }
}

export type SettingsFontFamily = {
  fontFamily: {
    values: string[]
    default: string
  }
}

export type SettingsPointsCount = {
  pointsCount: {
    min: number
    max: number
    step: number
    default: number
  }
}

export type ToolsRectSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsSquareSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsCircleSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsEllipseSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsTextSettings = SettingsOpacity & SettingsStrokeColor & SettingsFontFamily
export type ToolsLineSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsLineArrow

export type ToolsBrushSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsPolygonSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsPointsCount

export type ToolsCurveSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsPointsCount

export type ToolsPictureSettings = SettingsOpacity

export type ToolsSettingsType<T extends ShapeEnum> = T extends ShapeEnum.rect
  ? ToolsRectSettings
  : T extends ShapeEnum.square
  ? ToolsSquareSettings
  : T extends ShapeEnum.circle
  ? ToolsCircleSettings
  : T extends ShapeEnum.ellipse
  ? ToolsEllipseSettings
  : T extends ShapeEnum.text
  ? ToolsTextSettings
  : T extends ShapeEnum.line
  ? ToolsLineSettings
  : T extends ShapeEnum.brush
  ? ToolsBrushSettings
  : T extends ShapeEnum.polygon
  ? ToolsPolygonSettings
  : T extends ShapeEnum.curve
  ? ToolsCurveSettings
  : T extends ShapeEnum.picture
  ? ToolsPictureSettings
  : unknown // default

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
export type DrawableRect = Rect & Drawable & { type: ShapeEnum.rect }
export type DrawableSquare = Square & Drawable & { type: ShapeEnum.square }
export type DrawablePictureJson = StoredPicture & Drawable & { type: ShapeEnum.picture }
export type DrawablePicture = Picture & Drawable & { type: ShapeEnum.picture }
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
