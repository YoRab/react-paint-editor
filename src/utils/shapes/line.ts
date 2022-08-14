import { SELECTION_ANCHOR_SIZE } from 'constants/shapes'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type {
  Point,
  DrawableLine,
  Line,
  StyledShape,
  Triangle,
  Rect,
  DrawableCurve,
  DrawablePolygon
} from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { updateCanvasContext } from 'utils/canvas'
import { getPointPositionAfterCanvasTransformation } from 'utils/intersect'
import { rotatePoint } from 'utils/trigo'
import { getShapeInfos } from '.'
import { drawCircle } from './circle'
import { drawRect } from './rectangle'
import { drawTriangle } from './triangle'

export const createLine = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'line'
    settings: ToolsSettingsType<'line'>
  },
  cursorPosition: Point
): DrawableLine | undefined => {
  return {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    points: [cursorPosition, cursorPosition],
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default,
      lineArrow: shape.settings.lineArrow.default
    }
  }
}

export const buildTriangleOnLine = (center: Point, rotation: number, lineStyle: StyledShape) => {
  const trianglePoints = [
    rotatePoint({ point: [0, -(10 + (lineStyle.style?.lineWidth ?? 0) * 1)], rotation }),
    rotatePoint({
      point: [
        -(5 + (lineStyle.style?.lineWidth ?? 0) * 1),
        5 + (lineStyle.style?.lineWidth ?? 0) * 2
      ],
      rotation
    }),
    rotatePoint({
      point: [5 + (lineStyle.style?.lineWidth ?? 0) * 1, 5 + (lineStyle.style?.lineWidth ?? 0) * 2],
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
      ...lineStyle.style,
      fillColor: lineStyle.style?.strokeColor,
      strokeColor: 'transparent'
    }
  } as Triangle
}

export const drawLine = (ctx: CanvasRenderingContext2D, line: Line): void => {
  updateCanvasContext(ctx, line.style)

  if (ctx.globalAlpha === 0) return

  ctx.beginPath()
  ctx.moveTo(...line.points[0])
  ctx.lineTo(...line.points[1])
  line.style?.fillColor !== 'transparent' && ctx.fill()
  line.style?.strokeColor !== 'transparent' && ctx.stroke()
  if (line.style?.lineArrow === 1 || line.style?.lineArrow === 3) {
    const rotation =
      Math.PI / 2 -
      Math.atan2(line.points[1][1] - line.points[0][1], line.points[1][0] - line.points[0][0])
    drawTriangle(ctx, buildTriangleOnLine(line.points[0], rotation, { style: line.style }))
  }
  if (line.style?.lineArrow === 2 || line.style?.lineArrow === 3) {
    const rotation =
      Math.PI / 2 -
      Math.atan2(line.points[0][1] - line.points[1][1], line.points[0][0] - line.points[1][0])
    drawTriangle(ctx, buildTriangleOnLine(line.points[1], rotation, { style: line.style }))
  }
}

export const getLineBorder = (line: Line, selectionPadding: number): Rect => {
  const x = Math.min(line.points[0][0], line.points[1][0]) - selectionPadding
  const width = Math.abs(line.points[0][0] - line.points[1][0]) + selectionPadding * 2
  const y = Math.min(line.points[0][1], line.points[1][1]) - selectionPadding
  const height = Math.abs(line.points[0][1] - line.points[1][1]) + selectionPadding * 2
  return { x, width, y, height }
}

export const resizeLine = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableLine | DrawablePolygon | DrawableCurve,
  selectionMode: SelectionModeResize<number>,
  selectionPadding: number
): DrawableLine | DrawablePolygon | DrawableCurve => {
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

  return updatedShape
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
  shape: DrawableLine | DrawablePolygon | DrawableCurve
  withAnchors: boolean
  selectionPadding: number
  selectionWidth: number
  selectionColor: string
  currentScale?: number
}) => {
  const { borders } = getShapeInfos(shape, selectionPadding)
  drawRect(ctx, {
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
      drawRect(ctx, {
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
      drawCircle(ctx, {
        x: coordinate[0],
        y: coordinate[1],
        radius: SELECTION_ANCHOR_SIZE / 2 / currentScale,
        style: {
          fillColor: 'rgb(255,255,255)',
          strokeColor: 'rgb(150,150,150)',
          lineWidth: selectionWidth / currentScale
        }
      })
    }
  }
}
