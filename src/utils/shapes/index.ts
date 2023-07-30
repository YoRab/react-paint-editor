import _ from 'lodash/fp'
import { roundForGrid } from '../transform'
import type {
  Point,
  DrawableShape,
  Rect,
  DrawableLine,
  DrawableBrush,
  DrawableCircle,
  DrawableEllipse,
  DrawablePicture,
  DrawableText,
  DrawableRect
} from '../../types/Shapes'
import type { CustomTool } from '../../types/tools'
import type { GridFormatType } from '../../constants/app'
import { createBrush, drawBrush, getBrushBorder, resizeBrush } from './brush'
import { createLine, drawLine, drawLineSelection, getLineBorder, resizeLine } from './line'
import { createPolygon, drawPolygon, getPolygonBorder } from './polygon'
import { createCurve, drawCurve, getCurveBorder } from './curve'
import { createRectangle, drawRect, getRectBorder, resizeRect } from './rectangle'
import { createText, drawText, getTextBorder, resizeText } from './text'
import { createEllipse, drawEllipse, getEllipseBorder, resizeEllipse } from './ellipse'
import { createCircle, drawCircle, getCircleBorder, resizeCircle } from './circle'
import { drawPicture, getPictureBorder, resizePicture } from './picture'
import { GRID_ROTATION_STEPS } from '../../constants/style'
import { SelectionModeData, SelectionModeResize } from '../../types/Mode'
import { drawSelectionDefault } from './default'
import { transformCanvas } from '../../utils/canvas'

export const createShape = (
  ctx: CanvasRenderingContext2D,
  shape: CustomTool,
  cursorPosition: Point,
  gridFormat: GridFormatType
): DrawableShape | undefined => {
  const roundCursorPosition: Point = [
    roundForGrid(cursorPosition[0], gridFormat),
    roundForGrid(cursorPosition[1], gridFormat)
  ]
  switch (shape.type) {
    case 'brush':
      return createBrush(shape, roundCursorPosition)
    case 'line':
      return createLine(shape, roundCursorPosition)
    case 'polygon':
      return createPolygon(shape, roundCursorPosition)
    case 'curve':
      return createCurve(shape, roundCursorPosition)
    case 'rect':
    case 'square':
      return createRectangle(shape, roundCursorPosition)
    case 'text':
      return createText(ctx, shape, roundCursorPosition)
    case 'ellipse':
      return createEllipse(shape, roundCursorPosition)
    case 'circle':
      return createCircle(shape, roundCursorPosition)
  }
}

export const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  responsiveScale: number,
  canvasOffset: Point,
  selectionPadding: number
): void => {
  if (shape.visible === false) return
  const { center } = getShapeInfos(shape, selectionPadding)
  transformCanvas(ctx, responsiveScale, canvasOffset, shape.rotation, center)

  switch (shape.type) {
    case 'brush':
      drawBrush(ctx, shape)
      break
    case 'text':
      drawText(ctx, shape)
      break
    case 'line':
      drawLine(ctx, shape)
      break
    case 'polygon':
      drawPolygon(ctx, shape)
      break
    case 'curve':
      drawCurve(ctx, shape)
      break
    case 'circle':
      drawCircle(ctx, shape)
      break
    case 'ellipse':
      drawEllipse(ctx, shape)
      break
    case 'rect':
    case 'square':
      drawRect(ctx, shape)
      break
    case 'picture':
      drawPicture(ctx, shape)
      break
  }
  ctx.restore()
}

const getShapeBorders = (marker: DrawableShape, selectionPadding: number): Rect => {
  switch (marker.type) {
    case 'brush':
      return getBrushBorder(marker, selectionPadding)
    case 'line':
      return getLineBorder(marker, selectionPadding)
    case 'polygon':
      return getPolygonBorder(marker, selectionPadding)
    case 'curve':
      return getCurveBorder(marker, selectionPadding)
    case 'circle':
      return getCircleBorder(marker, selectionPadding)
    case 'ellipse':
      return getEllipseBorder(marker, selectionPadding)
    case 'rect':
    case 'square':
    default:
      return getRectBorder(marker, selectionPadding)
    case 'text':
      return getTextBorder(marker, selectionPadding)
    case 'picture':
      return getPictureBorder(marker, selectionPadding)
  }
}

const getShapeCenter = (borders: Rect): Point => {
  return [borders.x + borders.width / 2, borders.y + borders.height / 2]
}

export const getShapeInfos = (shape: DrawableShape, selectionPadding: number) => {
  const borders = getShapeBorders(shape, selectionPadding)
  const center = getShapeCenter(borders)
  return { borders, center }
}

export const rotateShape = (
  shape: DrawableShape,
  cursorPosition: Point,
  originalShape: DrawableShape,
  originalCursorPosition: Point,
  shapeCenter: Point,
  gridFormat: GridFormatType
) => {
  const p1x = shapeCenter[0] - originalCursorPosition[0]
  const p1y = shapeCenter[1] - originalCursorPosition[1]
  const p2x = shapeCenter[0] - cursorPosition[0]
  const p2y = shapeCenter[1] - cursorPosition[1]
  const rotation = originalShape.rotation + Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x)
  return {
    ...shape,
    ...{
      rotation: gridFormat
        ? rotation +
        Math.PI / GRID_ROTATION_STEPS / 2 -
        ((rotation + Math.PI / GRID_ROTATION_STEPS / 2) % (Math.PI / GRID_ROTATION_STEPS))
        : rotation
    }
  }
}

export const resizeShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape,
  selectionMode: SelectionModeData<Point | number>,
  selectionPadding: number,
  isShiftPressed: boolean
): DrawableShape => {
  switch (shape.type) {
    case 'line':
    case 'polygon':
    case 'curve':
      return resizeLine(
        cursorPosition,
        canvasOffset,
        originalShape as DrawableLine,
        selectionMode as SelectionModeResize<number>,
        selectionPadding
      )
    case 'brush':
      return resizeBrush(
        cursorPosition,
        canvasOffset,
        originalShape as DrawableBrush,
        selectionMode as SelectionModeResize,
        selectionPadding,
        isShiftPressed
      )
    case 'circle':
      return resizeCircle(
        cursorPosition,
        canvasOffset,
        originalShape as DrawableCircle,
        selectionMode as SelectionModeResize,
        selectionPadding
      )
    case 'ellipse':
      return resizeEllipse(
        cursorPosition,
        canvasOffset,
        originalShape as DrawableEllipse,
        selectionMode as SelectionModeResize,
        selectionPadding,
        isShiftPressed
      )
    case 'rect':
    case 'square':
      return resizeRect(
        cursorPosition,
        canvasOffset,
        originalShape as DrawableRect,
        selectionMode as SelectionModeResize,
        selectionPadding,
        shape.type === 'square' || isShiftPressed
      )
    case 'text':
      return resizeText(
        ctx,
        cursorPosition,
        canvasOffset,
        originalShape as DrawableText,
        selectionMode as SelectionModeResize,
        selectionPadding
      )
    case 'picture':
      return resizePicture(
        cursorPosition,
        canvasOffset,
        originalShape as DrawablePicture,
        selectionMode as SelectionModeResize,
        selectionPadding,
        !isShiftPressed
      )
  }
}

export const translateShape = (
  cursorPosition: Point,
  originalShape: DrawableShape,
  originalCursorPosition: Point,
  gridFormat: GridFormatType
): DrawableShape => {
  switch (originalShape.type) {
    case 'rect':
    case 'square':
    case 'ellipse':
    case 'circle':
    case 'picture':
    default:
      return {
        ...originalShape,
        x: roundForGrid(
          originalShape.x + cursorPosition[0] - originalCursorPosition[0],
          gridFormat
        ),
        y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
      }
    case 'line':
      return {
        ...originalShape,
        points: originalShape.points.map(([x, y]) => [
          roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
          roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
        ]) as [Point, Point]
      }
    case 'polygon':
    case 'curve':
      if (gridFormat) {
        const { borders } = getShapeInfos(originalShape, 0)
        const translationX =
          roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], gridFormat) -
          borders.x
        const translationY =
          roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], gridFormat) -
          borders.y
        return {
          ...originalShape,
          points: originalShape.points.map(([x, y]) => [x + translationX, y + translationY])
        }
      } else {
        return {
          ...originalShape,
          points: originalShape.points.map(([x, y]) => [
            roundForGrid(x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
            roundForGrid(y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
          ]) as Point[]
        }
      }
    case 'brush':
      if (gridFormat) {
        const { borders } = getShapeInfos(originalShape, 0)
        const translationX =
          roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], gridFormat) -
          borders.x
        const translationY =
          roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], gridFormat) -
          borders.y
        return {
          ...originalShape,
          points: originalShape.points.map(coord =>
            coord.map(([x, y]) => [x + translationX, y + translationY])
          ) as Point[][]
        }
      } else {
        return {
          ...originalShape,
          points: originalShape.points.map(coord =>
            coord.map(([x, y]) => [
              x + cursorPosition[0] - originalCursorPosition[0],
              y + cursorPosition[1] - originalCursorPosition[1]
            ])
          ) as Point[][]
        }
      }
  }
}

export const drawShapeSelection = ({
  ctx,
  shape,
  scaleRatio = 1,
  canvasOffset,
  selectionPadding,
  selectionWidth,
  selectionColor,
  withAnchors = true
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  scaleRatio: number
  canvasOffset: Point
  selectionPadding: number
  selectionWidth: number
  selectionColor: string
  withAnchors?: boolean
}) => {
  const { center } = getShapeInfos(shape, selectionPadding)
  transformCanvas(ctx, scaleRatio, canvasOffset, shape.rotation, center)

  switch (shape.type) {
    case 'polygon':
    case 'line':
    case 'curve':
      drawLineSelection({
        ctx,
        shape,
        withAnchors,
        selectionPadding,
        selectionWidth,
        selectionColor,
        currentScale: scaleRatio
      })
      break
    default:
      drawSelectionDefault({
        ctx,
        shape,
        withAnchors,
        selectionPadding,
        selectionWidth,
        selectionColor,
        currentScale: scaleRatio
      })
      break
  }
  ctx.restore()
}

export const copyShape = (shape: DrawableShape, gridFormat: GridFormatType) => {
  return {
    ...translateShape([20, 20], shape, [0, 0], gridFormat),
    id: _.uniqueId(`${shape.type}_`)
  } as DrawableShape
}
