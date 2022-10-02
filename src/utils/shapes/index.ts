import _ from 'lodash/fp'
import { roundForGrid } from '../transform'
import type { Point, DrawableShape, Rect, ShapeEntity } from 'types/Shapes'
import type { CustomTool } from 'types/tools'
import type { GridFormatType } from 'constants/app'
import {
  createBrush,
  drawBrush,
  drawSelectionBrush,
  getBrushBorder,
  refreshBrush,
  resizeBrush,
  translateBrush
} from './brush'
import {
  createLine,
  drawLine,
  drawLineSelection,
  getLineBorder,
  refreshLine,
  resizeLine,
  translateLine
} from './line'
import {
  createPolygon,
  drawPolygon,
  getPolygonBorder,
  refreshPolygon,
  resizePolygon,
  translatePolygon
} from './polygon'
import {
  createCurve,
  drawCurve,
  getCurveBorder,
  refreshCurve,
  resizeCurve,
  translateCurve
} from './curve'
import {
  createRectangle,
  getRectBorder,
  resizeRect,
  translateRect,
  drawRect,
  drawSelectionRect,
  refreshRect
} from './rectangle'
import {
  createText,
  drawSelectionText,
  drawText,
  getTextBorder,
  refreshText,
  resizeText,
  translateText
} from './text'
import {
  createEllipse,
  drawEllipse,
  drawSelectionEllipse,
  getEllipseBorder,
  refreshEllipse,
  resizeEllipse,
  translateEllipse
} from './ellipse'
import {
  createCircle,
  drawCircle,
  drawSelectionCircle,
  getCircleBorder,
  refreshCircle,
  resizeCircle,
  translateCircle
} from './circle'
import {
  drawPicture,
  drawSelectionPicture,
  getPictureBorder,
  refreshPicture,
  resizePicture,
  translatePicture
} from './picture'
import { GRID_ROTATION_STEPS } from 'constants/style'
import { SelectionModeData, SelectionModeResize } from 'types/Mode'
import { transformCanvas, updateCanvasContext } from 'utils/canvas'

export const createShape = (
  ctx: CanvasRenderingContext2D,
  shape: Exclude<CustomTool, { type: 'picture' }>,
  cursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
): ShapeEntity => {
  const roundCursorPosition: Point = [
    roundForGrid(cursorPosition[0], gridFormat),
    roundForGrid(cursorPosition[1], gridFormat)
  ]
  switch (shape.type) {
    case 'brush':
      return createBrush(shape, roundCursorPosition, currentScale, selectionPadding)
    case 'line':
      return createLine(shape, roundCursorPosition, currentScale, selectionPadding)
    case 'polygon':
      return createPolygon(shape, roundCursorPosition, currentScale, selectionPadding)
    case 'curve':
      return createCurve(shape, roundCursorPosition, currentScale, selectionPadding)
    case 'rect':
    case 'square':
      return createRectangle(shape, roundCursorPosition, currentScale, selectionPadding)
    case 'text':
      return createText(ctx, shape, roundCursorPosition, currentScale, selectionPadding)
    case 'ellipse':
      return createEllipse(shape, roundCursorPosition, currentScale, selectionPadding)
    case 'circle':
      return createCircle(shape, roundCursorPosition, currentScale, selectionPadding)
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
        selectionPadding,
        currentScale
      ) as T
    case 'polygon':
      return resizePolygon(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize<number>,
        selectionPadding,
        currentScale
      ) as T
    case 'curve':
      return resizeCurve(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize<number>,
        selectionPadding,
        currentScale
      ) as T
    case 'brush':
      originalShape.type
      return resizeBrush(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        currentScale,
        isShiftPressed
      ) as T
    case 'circle':
      return resizeCircle(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        currentScale
      ) as T
    case 'ellipse':
      return resizeEllipse(
        cursorPosition,
        canvasOffset,
        originalShape,
        selectionMode as SelectionModeResize,
        selectionPadding,
        currentScale,
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
  currentScale: number,
  selectionPadding: number
): ShapeEntity => {
  switch (originalShape.type) {
    case 'rect':
    case 'square':
      return translateRect(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'ellipse':
      return translateEllipse(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'circle':
      return translateCircle(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'picture':
      return translatePicture(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'text':
      return translateText(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'line':
      return translateLine(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'polygon':
      return translatePolygon(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'curve':
      return translateCurve(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    case 'brush':
      return translateBrush(
        cursorPosition,
        originalShape,
        originalCursorPosition,
        gridFormat,
        currentScale,
        selectionPadding
      )
    default:
      return originalShape
  }
}

export const refreshShape = (
  shape: ShapeEntity,
  currentScale: number,
  selectionPadding: number
): ShapeEntity => {
  switch (shape.type) {
    case 'rect':
    case 'square':
      return refreshRect(shape, currentScale, selectionPadding)
    case 'ellipse':
      return refreshEllipse(shape, currentScale, selectionPadding)
    case 'circle':
      return refreshCircle(shape, currentScale, selectionPadding)
    case 'picture':
      return refreshPicture(shape, currentScale, selectionPadding)
    case 'text':
      return refreshText(shape, currentScale, selectionPadding)
    case 'line':
      return refreshLine(shape, currentScale, selectionPadding)
    case 'polygon':
      return refreshPolygon(shape, currentScale, selectionPadding)
    case 'curve':
      return refreshCurve(shape, currentScale, selectionPadding)
    case 'brush':
      return refreshBrush(shape, currentScale, selectionPadding)
    default:
      return shape
  }
}

export const drawShapeSelection = ({
  ctx,
  shape,
  currentScale = 1,
  canvasOffset,
  selectionPadding,
  selectionWidth,
  selectionColor,
  withAnchors = true
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  currentScale: number
  canvasOffset: Point
  selectionPadding: number
  selectionWidth: number
  selectionColor: string
  withAnchors?: boolean
}) => {
  const { center } = getShapeInfos(shape, selectionPadding)
  transformCanvas(ctx, currentScale, canvasOffset, shape.rotation, center)

  switch (shape.type) {
    case 'rect':
    case 'square':
      drawSelectionRect(ctx, shape, selectionColor, selectionWidth, currentScale, withAnchors)
      break
    case 'ellipse':
      drawSelectionEllipse(ctx, shape, selectionColor, selectionWidth, currentScale, withAnchors)
      break
    case 'circle':
      drawSelectionCircle(ctx, shape, selectionColor, selectionWidth, currentScale, withAnchors)
      break
    case 'picture':
      drawSelectionPicture(ctx, shape, selectionColor, selectionWidth, currentScale, withAnchors)
      break
    case 'text':
      drawSelectionText(ctx, shape, selectionColor, selectionWidth, currentScale, withAnchors)
      break
    case 'brush':
      drawSelectionBrush(ctx, shape, selectionColor, selectionWidth, currentScale, withAnchors)
      break
    case 'polygon':
    case 'line':
    case 'curve':
      drawLineSelection({
        ctx,
        shape,
        withAnchors,
        selectionWidth,
        selectionColor,
        currentScale
      })
      break
  }
  ctx.restore()
}

export const copyShape = (
  shape: ShapeEntity,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  return {
    ...translateShape([20, 20], shape, [0, 0], gridFormat, currentScale, selectionPadding),
    id: _.uniqueId(`${shape.type}_`)
  } as ShapeEntity
}
