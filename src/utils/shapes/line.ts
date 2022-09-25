import { GridFormatType } from 'constants/app'
import { SELECTION_ANCHOR_SIZE } from 'constants/shapes'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type {
  Point,
  DrawableShape,
  Line,
  Triangle,
  ShapeEntity,
  Rect,
  StyleShape
} from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { updateCanvasContext } from 'utils/canvas'
import { getPointPositionAfterCanvasTransformation } from 'utils/intersect'
import { roundForGrid } from 'utils/transform'
import { getAngleFromVector, rotatePoint } from 'utils/trigo'
import { getShapeInfos } from 'utils/shapes/index'
import { legacyDrawRect } from './rectangle'
import { createTriangle, drawTriangle } from './triangle'

const createLinePath = (line: DrawableShape<'line'>) => {
  const path = new Path2D()
  path.moveTo(...line.points[0])
  path.lineTo(...line.points[1])
  return path
}

const buildPath = <T extends DrawableShape<'line'>>(line: T): T => {
  const arrows = _.flow(
    (arrows: DrawableShape<'triangle'>[]) => {
      if (line.style?.lineArrow === 1 || line.style?.lineArrow === 3) {
        const rotation = Math.PI / 2 - getAngleFromVector(line.points[0], line.points[1])
        return [
          ...arrows,
          createTriangle(buildTriangleOnLine(line.points[0], rotation, line.style))
        ]
      }
      return arrows
    },
    (arrows: DrawableShape<'triangle'>[]) => {
      if (line.style?.lineArrow === 2 || line.style?.lineArrow === 3) {
        const rotation = Math.PI / 2 - getAngleFromVector(line.points[1], line.points[0])
        return [
          ...arrows,
          createTriangle(buildTriangleOnLine(line.points[1], rotation, line.style))
        ]
      }
      return arrows
    }
  )([])

  return {
    ...line,
    path: createLinePath(line),
    arrows
  }
}

export const createLine = (
  shape: {
    id: string
    type: 'line'
    settings: ToolsSettingsType<'line'>
  },
  cursorPosition: Point
): ShapeEntity<'line'> => {
  const lineShape = {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    points: [cursorPosition, cursorPosition] as const,
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default,
      lineArrow: shape.settings.lineArrow.default
    }
  }
  return buildPath(lineShape)
}

export const buildTriangleOnLine = (center: Point, rotation: number, lineStyle: StyleShape) => {
  const trianglePoints = [
    rotatePoint({ point: [0, -(10 + (lineStyle.lineWidth ?? 0) * 1)], rotation }),
    rotatePoint({
      point: [-(5 + (lineStyle.lineWidth ?? 0) * 1), 5 + (lineStyle.lineWidth ?? 0) * 2],
      rotation
    }),
    rotatePoint({
      point: [5 + (lineStyle.lineWidth ?? 0) * 1, 5 + (lineStyle.lineWidth ?? 0) * 2],
      rotation
    })
  ]
  return {
    points: [
      [center[0] + trianglePoints[0][0], center[1] + trianglePoints[0][1]],
      [center[0] + trianglePoints[1][0], center[1] + trianglePoints[1][1]],
      [center[0] + trianglePoints[2][0], center[1] + trianglePoints[2][1]]
    ],
    style: {
      ...lineStyle,
      fillColor: lineStyle.strokeColor,
      strokeColor: 'transparent'
    }
  } as Triangle
}

export const drawLine = (ctx: CanvasRenderingContext2D, shape: DrawableShape<'line'>): void => {
  if (ctx.globalAlpha === 0 || !shape.path) return

  shape.style?.fillColor !== 'transparent' && ctx.fill(shape.path)
  shape.style?.strokeColor !== 'transparent' && ctx.stroke(shape.path)

  for (const arrow of shape.arrows ?? []) {
    updateCanvasContext(ctx, arrow.style)
    drawTriangle(ctx, arrow)
  }
}

export const getLineBorder = (line: Line, selectionPadding: number): Rect => {
  const x = Math.min(line.points[0][0], line.points[1][0]) - selectionPadding
  const width = Math.abs(line.points[0][0] - line.points[1][0]) + selectionPadding * 2
  const y = Math.min(line.points[0][1], line.points[1][1]) - selectionPadding
  const height = Math.abs(line.points[0][1] - line.points[1][1]) + selectionPadding * 2
  return { x, width, y, height }
}

export const translateLine = <U extends DrawableShape<'line'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType
) => {
  return buildPath({
    ...originalShape,
    points: originalShape.points.map(([x, y]) => [
      roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    ]) as [Point, Point]
  })
}

export const resizeLine = <U extends DrawableShape<'line'>>(
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: U,
  selectionMode: SelectionModeResize<number>,
  selectionPadding: number
): U => {
  const { center } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )
  const updatedShape = _.set(
    ['points', selectionMode.anchor],
    cursorPositionBeforeResize,
    originalShape
  )

  return buildPath(updatedShape)
}

export const drawLineSelection = ({
  ctx,
  shape,
  withAnchors,
  selectionPadding,
  selectionWidth,
  selectionColor,
  currentScale = 1
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape<'line'> | DrawableShape<'polygon'> | DrawableShape<'curve'>
  withAnchors: boolean
  selectionPadding: number
  selectionWidth: number
  selectionColor: string
  currentScale?: number
}) => {
  const { borders } = getShapeInfos(shape, selectionPadding)
  shape.type
  legacyDrawRect(ctx, {
    type: 'rect',
    rotation: 0,
    ...borders,
    style: {
      fillColor: 'transparent',
      strokeColor: selectionColor,
      lineWidth: selectionWidth / currentScale
    }
  })
  if (!withAnchors || shape.locked) return
  for (let i = 0; i < shape.points.length; i++) {
    const coordinate = shape.points[i]

    if (shape.type === 'curve' && i > 0 && i < shape.points.length - 1) {
      legacyDrawRect(ctx, {
        type: 'rect',
        rotation: 0,
        x: coordinate[0] - SELECTION_ANCHOR_SIZE / 2,
        y: coordinate[1] - SELECTION_ANCHOR_SIZE / 2,
        width: SELECTION_ANCHOR_SIZE / currentScale,
        height: SELECTION_ANCHOR_SIZE / currentScale,
        style: {
          fillColor: 'rgb(255,255,255)',
          strokeColor: 'rgb(150,150,150)',
          lineWidth: selectionWidth / currentScale
        }
      })
    } else {
      /* drawCircle(ctx, {
        x: coordinate[0],
        y: coordinate[1],
        radius: SELECTION_ANCHOR_SIZE / 2 / currentScale,
        style: {
          fillColor: 'rgb(255,255,255)',
          strokeColor: 'rgb(150,150,150)',
          lineWidth: selectionWidth / currentScale
        }
      })*/
    }
  }
}
