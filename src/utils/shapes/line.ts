import { GridFormatType } from '../../constants/app'
import { SelectionModeResize } from '../../types/Mode'
import type {
  Point,
  DrawableShape,
  Line,
  Triangle,
  ShapeEntity,
  Rect,
  StyleShape,
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { updateCanvasContext } from '../../utils/canvas'
import { getPointPositionAfterCanvasTransformation } from '../../utils/intersect'
import { roundForGrid, shortenLine } from '../../utils/transform'
import { getAngleFromVector, rotatePoint } from '../../utils/trigo'
import { getShapeInfos } from '../../utils/shapes/index'
import { createTriangle, drawTriangle } from './triangle'
import { createLinePath } from '../../utils/shapes/path'
import { createLineSelectionPath } from '../../utils/selection/lineSelection'
import { set } from '../../utils/object'
import { uniqueId } from '../../utils/util'

const buildPath = <T extends DrawableShape<'line'>>(
  line: T,
  currentScale: number,
  selectionPadding: number
): T => {
  const arrows = []
  let path: Path2D

  if (line.style?.lineArrow === 1 || line.style?.lineArrow === 2 || line.style?.lineArrow === 3) {
    const rotation = Math.PI / 2 - getAngleFromVector({ targetVector: [line.points[0], line.points[1]] })

    if (line.style?.lineArrow === 1 || line.style?.lineArrow === 3) {
      arrows.push(createTriangle(buildTriangleOnLine(line.points[0], rotation, line.style)))
    }
    if (line.style?.lineArrow === 2 || line.style?.lineArrow === 3) {
      arrows.push(createTriangle(buildTriangleOnLine(line.points[1], rotation + Math.PI, line.style)))
    }

    const arrowLength = 10 + (line.style?.lineWidth ?? 0) * 2
    const newLine = shortenLine({ line, size: arrowLength, direction: line.style?.lineArrow === 1 ? 'start' : line.style?.lineArrow === 2 ? 'end' : 'both' })
    path = createLinePath(newLine)
  } else {
    path = createLinePath(line)
  }

  return {
    ...line,
    path,
    selection: createLineSelectionPath(path, line, currentScale, selectionPadding),
    arrows,
    style: {
      ...line.style,
      lineCap: line.style?.lineArrow ? 'butt' : 'round'
    }
  }
}

export const refreshLine = buildPath

export const createLine = (
  shape: {
    id: string
    type: 'line'
    settings: ToolsSettingsType<'line'>
  },
  cursorPosition: Point,
  currentScale: number,
  selectionPadding: number
): ShapeEntity<'line'> => {
  const lineShape = {
    toolId: shape.id,
    type: shape.type,
    id: uniqueId(`${shape.type}_`),
    points: [cursorPosition, cursorPosition] as const,
    rotation: 0,
    style: {
      opacity: shape.settings.opacity.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default,
      lineArrow: shape.settings.lineArrow.default
    }
  }
  return buildPath(lineShape, currentScale, selectionPadding)
}

export const buildTriangleOnLine = (center: Point, rotation: number, lineStyle: StyleShape) => {
  const trianglePoints = [
    rotatePoint({ point: [0, 0], rotation }),
    rotatePoint({
      point: [-(5 + (lineStyle.lineWidth ?? 0)), 10 + (lineStyle.lineWidth ?? 0) * 2],
      rotation
    }),
    rotatePoint({
      point: [5 + (lineStyle.lineWidth ?? 0), 10 + (lineStyle.lineWidth ?? 0) * 2],
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
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(([x, y]) => [
        roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
        roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
      ]) as [Point, Point]
    },
    currentScale,
    selectionPadding
  )
}

export const resizeLine = <U extends DrawableShape<'line'>>(
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: U,
  selectionMode: SelectionModeResize<number>,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number
): U => {

  const roundCursorPosition: Point = [
    roundForGrid(cursorPosition[0], gridFormat),
    roundForGrid(cursorPosition[1], gridFormat)
  ]

  const { center } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    roundCursorPosition,
    originalShape.rotation,
    center,
    canvasOffset
  )
  const updatedShape = set(
    ['points', selectionMode.anchor],
    cursorPositionBeforeResize,
    originalShape
  )

  return buildPath(updatedShape, currentScale, selectionPadding)
}