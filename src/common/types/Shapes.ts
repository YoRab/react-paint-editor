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
  rotation?: number
  toolId?: string
  visible?: boolean
  locked?: boolean
  style?: StyleShape | undefined
} & (T extends 'line'
  ? Line & {
      type: 'line'
    }
  : T extends 'picture'
    ? Picture & {
        img: HTMLImageElement
        type: 'picture'
      }
    : T extends 'text'
      ? Text & {
          type: 'text'
        }
      : T extends 'rect'
        ? Rect & {
            type: 'rect'
          }
        : T extends 'square'
          ? Rect & {
              type: 'square'
            }
          : T extends 'circle'
            ? Circle & {
                type: 'circle'
              }
            : T extends 'ellipse'
              ? Ellipse & {
                  type: 'ellipse'
                }
              : T extends 'triangle'
                ? Triangle & {
                    type: 'triangle'
                  }
                : T extends 'polygon'
                  ? Polygon & {
                      type: 'polygon'
                    }
                  : T extends 'curve'
                    ? Curve & {
                        type: 'curve'
                      }
                    : T extends 'brush'
                      ? Brush & {
                          type: 'brush'
                          scaleX?: number
                          scaleY?: number
                        }
                      : T extends 'group'
                        ? Rect & {
                            shapes: ShapeEntity[]
                            type: 'group'
                          }
                        : never)

export type ExportedDrawableShape<T extends ShapeType = ShapeType> = T extends 'picture' ? Omit<DrawableShape<'picture'>, 'img'> : DrawableShape<T>

export type TriangleEntity = DrawableShape<'triangle'> & {
  path: Path2D
  computed: {
    borders: Rect
    outerBorders: Rect
    center: Point
    boundingBox: Rect
  }
}

export type ShapeEntity<T extends Exclude<ShapeType, 'triangle'> = Exclude<ShapeType, 'triangle'>> = {
  id: string
  computed: {
    borders: Rect
    outerBorders: Rect
    center: Point
    boundingBox: Rect
  }
} & DrawableShape<T> &
  (T extends 'line'
    ? {
        selection?: SelectionLinesType | undefined
        path?: Path2D | undefined
        arrows?: TriangleEntity[]
        type: 'line'
      }
    : T extends 'picture'
      ? {
          img: HTMLImageElement
          selection?: SelectionDefaultType | undefined
          type: 'picture'
        }
      : T extends 'text'
        ? { selection?: SelectionDefaultType | undefined; type: 'text' }
        : T extends 'rect'
          ? {
              selection?: SelectionDefaultType | undefined
              path?: Path2D | undefined
              type: 'rect'
            }
          : T extends 'square'
            ? {
                selection?: SelectionDefaultType | undefined
                path?: Path2D | undefined
                type: 'square'
              }
            : T extends 'circle'
              ? {
                  selection?: SelectionDefaultType | undefined
                  path?: Path2D | undefined
                  type: 'circle'
                }
              : T extends 'ellipse'
                ? {
                    selection?: SelectionDefaultType | undefined
                    path?: Path2D | undefined
                    type: 'ellipse'
                  }
                : T extends 'polygon'
                  ? {
                      selection?: SelectionLinesType | undefined
                      path?: Path2D | undefined
                      type: 'polygon'
                    }
                  : T extends 'curve'
                    ? {
                        selection?: SelectionLinesType | undefined
                        path?: Path2D | undefined
                        type: 'curve'
                      }
                    : T extends 'brush'
                      ? {
                          selection?: SelectionDefaultType | undefined
                          path?: Path2D | undefined
                          type: 'brush'
                        }
                      : T extends 'group'
                        ? {
                            selection?: SelectionDefaultType | undefined
                            path?: Path2D | undefined
                            type: 'group'
                          }
                        : never)

export type StateData = {
  shapes?: DrawableShape[]
  config?: {
    width: number
    height: number
  }
}

export type SelectionType = ShapeEntity
