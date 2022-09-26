import _ from 'lodash/fp'
import { roundForGrid } from '../transform'
import type { Point, DrawableShape, Rect, ShapeEntity } from 'types/Shapes'
import type { CustomTool } from 'types/tools'
import type { GridFormatType } from 'constants/app'
import { createBrush, drawBrush, getBrushBorder, resizeBrush, translateBrush } from './brush'
import {
  createLine,
  drawLine,
  drawLineSelection,
  getLineBorder,
  resizeLine,
  translateLine
} from './line'
import {
  createPolygon,
  drawPolygon,
  getPolygonBorder,
  resizePolygon,
  translatePolygon
} from './polygon'
import { createCurve, drawCurve, getCurveBorder, resizeCurve, translateCurve } from './curve'
import { createRectangle, getRectBorder, resizeRect, translateRect, drawRect } from './rectangle'
import { createText, drawText, getTextBorder, resizeText, translateText } from './text'
import {
  createEllipse,
  drawEllipse,
  getEllipseBorder,
  resizeEllipse,
  translateEllipse
} from './ellipse'
import { createCircle, drawCircle, getCircleBorder, resizeCircle, translateCircle } from './circle'
import { drawPicture, getPictureBorder, resizePicture, translatePicture } from './picture'
import { GRID_ROTATION_STEPS } from 'constants/style'
import { SelectionModeData, SelectionModeResize } from 'types/Mode'
import { drawSelectionDefault } from './default'
import { transformCanvas, updateCanvasContext } from 'utils/canvas'

export const createShape = (
  ctx: CanvasRenderingContext2D,
  shape: Exclude<CustomTool, { type: 'picture' }>,
  cursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number
): ShapeEntity => {
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
      return createRectangle(shape, roundCursorPosition, currentScale)
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
  updateCanvasContext(ctx, shape.style)

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
      drawRect(ctx, shape)
      break
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
      return getRectBorder(marker, selectionPadding)
    case 'text':
      return getTextBorder(marker, selectionPadding)
    case 'picture':
      return getPictureBorder(marker, selectionPadding)
    default:
      return {
        x: 0,
        y: 0,
        width: 100,
        height: 100
      } // TODO a cause du triangle, a supprimer
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

export const rotateShape = <T extends DrawableShape>(
  shape: T,
  cursorPosition: Point,
  originalShape: T,
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

export const resizeShape = <T extends DrawableShape>(
  ctx: CanvasRenderingContext2D,
  shape: T,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: T,
  selectionMode: SelectionModeData<Point | number>,
  selectionPadding: number,
  isShiftPressed: boolean,
  currentScale: number
): T => {
  switch (originalShape.type) {
    case 'line':
      return resizeLine(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize<number>,
        selectionPadding
      ) as T
    case 'polygon':
      return resizePolygon(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize<number>,
        selectionPadding
      ) as T
    case 'curve':
      return resizeCurve(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize<number>,
        selectionPadding
      ) as T
    case 'brush':
      originalShape.type
      return resizeBrush(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        isShiftPressed
      ) as T
    case 'circle':
      return resizeCircle(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding
      ) as T
    case 'ellipse':
      return resizeEllipse(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        isShiftPressed
      ) as T
    case 'rect':
    case 'square':
      return resizeRect(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        currentScale,
        shape.type === 'square' || isShiftPressed
      ) as T
    case 'text':
      return resizeText(
        ctx,
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        currentScale
      ) as T
    case 'picture':
      return resizePicture(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        currentScale,
        !isShiftPressed
      ) as T
    default:
      return originalShape
  }
}

export const translateShape = (
  cursorPosition: Point,
  originalShape: ShapeEntity,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number
): ShapeEntity => {
  switch (originalShape.type) {
    case 'rect':
    case 'square':
      return translateRect(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale
      )
    case 'ellipse':
      return translateEllipse(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'circle':
      return translateCircle(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'picture':
      return translatePicture(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'text':
      return translateText(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'line':
      return translateLine(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'polygon':
      return translatePolygon(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'curve':
      return translateCurve(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    case 'brush':
      return translateBrush(cursorPosition, originalShape, originalCursorPosition, gridFormat)
    default:
      return originalShape
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

export const copyShape = (shape: ShapeEntity, gridFormat: GridFormatType, currentScale: number) => {
  return {
    ...translateShape([20, 20], shape, [0, 0], gridFormat, currentScale),
    id: _.uniqueId(`${shape.type}_`)
  } as ShapeEntity
}
