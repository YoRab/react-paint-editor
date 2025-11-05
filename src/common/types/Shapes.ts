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

export type DrawableShape<T extends ShapeType = ShapeType> = {
  toolId?: string
  visible?: boolean
  locked?: boolean
  rotation: number
  style?: StyleShape | undefined
} & (T extends 'line'
  ? Line & {
      type: 'line'
      selection?: SelectionLinesType | undefined
      path?: Path2D
      arrows?: DrawableShape<'triangle'>[]
    }
  : T extends 'picture'
    ? Picture & {
        type: 'picture'
        img: HTMLImageElement
        selection?: SelectionDefaultType | undefined
      }
    : T extends 'text'
      ? Text & { type: 'text'; selection?: SelectionDefaultType | undefined }
      : T extends 'rect'
        ? Rect & {
            type: 'rect'
            selection?: SelectionDefaultType | undefined
            path?: Path2D
          }
        : T extends 'square'
          ? Rect & {
              type: 'square'
              selection?: SelectionDefaultType | undefined
              path?: Path2D
            }
          : T extends 'circle'
            ? Circle & {
                type: 'circle'
                selection?: SelectionDefaultType | undefined
                path?: Path2D
              }
            : T extends 'ellipse'
              ? Ellipse & {
                  type: 'ellipse'
                  selection?: SelectionDefaultType | undefined
                  path?: Path2D
                }
              : T extends 'triangle'
                ? Triangle & { type: 'triangle'; path?: Path2D }
                : T extends 'polygon'
                  ? Polygon & {
                      type: 'polygon'
                      selection?: SelectionLinesType | undefined
                      path?: Path2D
                    }
                  : T extends 'curve'
                    ? Curve & {
                        type: 'curve'
                        selection?: SelectionLinesType | undefined
                        path?: Path2D
                      }
                    : T extends 'brush'
                      ? Brush & {
                          type: 'brush'
                          selection?: SelectionDefaultType | undefined
                          path?: Path2D
                          scaleX?: number
                          scaleY?: number
                        }
                      : T extends 'group'
                        ? Rect & {
                            type: 'group'
                            selection?: SelectionDefaultType | undefined
                            path?: Path2D
                            shapes: ShapeEntity[]
                          }
                        : never)

export type ExportedDrawableShape<T extends ShapeType = ShapeType> = T extends 'picture' ? Omit<DrawableShape<'picture'>, 'img'> : DrawableShape<T>

export type ShapeEntity<T extends Exclude<ShapeType, 'triangle'> = Exclude<ShapeType, 'triangle'>> = {
  id: string
} & DrawableShape<T>

export type StateData = {
  shapes?: DrawableShape[]
  config?: {
    width: number
    height: number
  }
}

export type SelectionType = ShapeEntity
