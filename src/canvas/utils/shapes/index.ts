import type { UtilsSettings } from '@canvas/constants/app'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { getRectIntersection } from '@canvas/utils/intersect'
import { drawLineSelection } from '@canvas/utils/selection/lineSelection'
import { drawSelectionRect } from '@canvas/utils/selection/rectSelection'
import { drawFrame } from '@canvas/utils/selection/selectionFrame'
import { roundForGrid, roundRotationForGrid } from '@canvas/utils/transform'
import { getCurrentView } from '@canvas/utils/zoom'
import type { HoverModeData, SelectionModeData, SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { createBrush, drawBrush, getBrushBorder, refreshBrush, resizeBrush, translateBrush } from './brush'
import { createCircle, drawCircle, getCircleBorder, refreshCircle, resizeCircle, translateCircle } from './circle'
import { createCurve, drawCurve, getCurveBorder, refreshCurve, resizeCurve, translateCurve } from './curve'
import { createEllipse, drawEllipse, getEllipseBorder, refreshEllipse, resizeEllipse, translateEllipse } from './ellipse'
import { createLine, drawLine, getLineBorder, refreshLine, resizeLine, translateLine } from './line'
import { drawPicture, getPictureBorder, refreshPicture, resizePicture, translatePicture } from './picture'
import { createPolygon, drawPolygon, getPolygonBorder, refreshPolygon, resizePolygon, translatePolygon } from './polygon'
import { createRectangle, drawRect, getRectBorder, refreshRect, resizeRect, translateRect } from './rectangle'
import { createText, drawText, getTextBorder, refreshText, resizeText, translateText } from './text'

export const createShape = (
  ctx: CanvasRenderingContext2D,
  shape: Exclude<CustomTool, { type: 'picture' }>,
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity => {
  const roundCursorPosition: Point = [roundForGrid(cursorPosition[0], settings), roundForGrid(cursorPosition[1], settings)]
  switch (shape.type) {
    case 'brush':
      return createBrush(shape, roundCursorPosition, settings)
    case 'line':
      return createLine(shape, roundCursorPosition, settings)
    case 'polygon':
      return createPolygon(shape, roundCursorPosition, settings)
    case 'curve':
      return createCurve(shape, roundCursorPosition, settings)
    case 'rect':
    case 'square':
      return createRectangle(shape, roundCursorPosition, settings)
    case 'text':
      return createText(ctx, shape, roundCursorPosition, settings)
    case 'ellipse':
      return createEllipse(shape, roundCursorPosition, settings)
    case 'circle':
      return createCircle(shape, roundCursorPosition, settings)
  }
}

const drawShapeByType = (ctx: CanvasRenderingContext2D, shape: DrawableShape): void => {
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
}

/**
 * Renders a shape with opacity on a temporary canvas and then draws it on the main canvas
 * @param ctx - The main canvas context
 * @param shape - The shape to draw
 * @param outerBorders - The outer borders of the shape
 */
const drawShapeWithOpacity = (ctx: CanvasRenderingContext2D, shape: DrawableShape, outerBorders: Rect): void => {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('No context found for canvas')
  const tempCanvasSize = {
    width: outerBorders.width * 2,
    height: outerBorders.height * 2
  }
  tempCanvas.width = tempCanvasSize.width
  tempCanvas.height = tempCanvasSize.height
  tempCtx.translate(tempCanvasSize.width / 4 - outerBorders.x, tempCanvasSize.height / 4 - outerBorders.y)
  updateCanvasContext(tempCtx, { ...shape.style, opacity: 100 })

  drawShapeByType(tempCtx, shape)

  ctx.drawImage(tempCanvas, outerBorders.x - tempCanvasSize.width / 4, outerBorders.y - tempCanvasSize.height / 4)
}

export const drawShape = (ctx: CanvasRenderingContext2D, shape: DrawableShape, settings: UtilsSettings): void => {
  if (shape.visible === false) return
  const { center, outerBorders } = getShapeInfos(shape, settings)
  const currentView = getCurrentView(settings)
  const isInView = !!getRectIntersection(outerBorders, currentView)
  if (!isInView) return
  transformCanvas(ctx, settings, shape.rotation, center)
  updateCanvasContext(ctx, shape.style)

  if (ctx.globalAlpha !== 1) {
    drawShapeWithOpacity(ctx, shape, outerBorders)
    ctx.restore()
    return
  }
  drawShapeByType(ctx, shape)

  ctx.restore()
}

const getShapeBorders = (marker: DrawableShape, settings: UtilsSettings): Rect => {
  switch (marker.type) {
    case 'brush':
      return getBrushBorder(marker, settings)
    case 'line':
      return getLineBorder(marker, settings)
    case 'polygon':
      return getPolygonBorder(marker, settings)
    case 'curve':
      return getCurveBorder(marker, settings)
    case 'circle':
      return getCircleBorder(marker, settings)
    case 'ellipse':
      return getEllipseBorder(marker, settings)
    case 'rect':
    case 'square':
      return getRectBorder(marker, settings)
    case 'text':
      return getTextBorder(marker, settings)
    case 'picture':
      return getPictureBorder(marker, settings)
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

export const getShapeInfos = (
  shape: DrawableShape,
  settings: UtilsSettings
): {
  borders: Rect
  outerBorders: Rect
  center: Point
} => {
  const borders = getShapeBorders(shape, settings)
  const outerBorders = {
    x: borders.x - (shape.style?.lineWidth ?? 0),
    y: borders.y - (shape.style?.lineWidth ?? 0),
    width: borders.width + 2 * (shape.style?.lineWidth ?? 0),
    height: borders.height + 2 * (shape.style?.lineWidth ?? 0)
  }
  const center = getShapeCenter(borders)
  return { borders, outerBorders, center }
}

export const rotateShape = <T extends DrawableShape>(
  shape: T,
  cursorPosition: Point,
  originalShape: T,
  originalCursorPosition: Point,
  shapeCenter: Point,
  settings: UtilsSettings,
  isShiftPressed: boolean
) => {
  const p1x = shapeCenter[0] - originalCursorPosition[0]
  const p1y = shapeCenter[1] - originalCursorPosition[1]
  const p2x = shapeCenter[0] - cursorPosition[0]
  const p2y = shapeCenter[1] - cursorPosition[1]
  const rotation = originalShape.rotation + Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x)
  return {
    ...shape,
    ...{
      rotation: roundRotationForGrid(rotation, settings, isShiftPressed)
    }
  }
}

export const resizeShape = <T extends DrawableShape>(
  ctx: CanvasRenderingContext2D,
  shape: T,
  cursorPosition: Point,
  originalShape: T,
  selectionMode: SelectionModeData<Point | number>,
  settings: UtilsSettings,
  isShiftPressed: boolean,
  isAltPressed: boolean
): T => {
  switch (originalShape.type) {
    case 'line':
      return resizeLine(cursorPosition, originalShape, selectionMode as SelectionModeResize<number>, settings) as T
    case 'polygon':
      return resizePolygon(cursorPosition, originalShape, selectionMode as SelectionModeResize<number>, settings) as T
    case 'curve':
      return resizeCurve(cursorPosition, originalShape, selectionMode as SelectionModeResize<number>, settings) as T
    case 'brush':
      return resizeBrush(cursorPosition, originalShape, selectionMode as SelectionModeResize, settings, isShiftPressed, isAltPressed) as T
    case 'circle':
      return resizeCircle(cursorPosition, originalShape, selectionMode as SelectionModeResize, settings, isAltPressed) as T
    case 'ellipse':
      return resizeEllipse(cursorPosition, originalShape, selectionMode as SelectionModeResize, settings, isShiftPressed, isAltPressed) as T
    case 'rect':
    case 'square':
      return resizeRect(
        cursorPosition,
        originalShape,
        selectionMode as SelectionModeResize,
        settings,
        shape.type === 'square' || isShiftPressed,
        isAltPressed
      ) as T
    case 'text':
      return resizeText(ctx, cursorPosition, originalShape, selectionMode as SelectionModeResize, settings, isAltPressed) as T
    case 'picture':
      return resizePicture(cursorPosition, originalShape, selectionMode as SelectionModeResize, settings, isAltPressed) as T
    default:
      return originalShape
  }
}

export const translateShape = (
  cursorPosition: Point,
  originalShape: ShapeEntity,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  isShiftPressed: boolean
): ShapeEntity => {
  switch (originalShape.type) {
    case 'rect':
    case 'square':
      return translateRect(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'ellipse':
      return translateEllipse(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'circle':
      return translateCircle(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'picture':
      return translatePicture(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'text':
      return translateText(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'line':
      return translateLine(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'polygon':
      return translatePolygon(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'curve':
      return translateCurve(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    case 'brush':
      return translateBrush(cursorPosition, originalShape, originalCursorPosition, settings, isShiftPressed)
    default:
      return originalShape
  }
}

export const refreshShape = (shape: ShapeEntity, settings: UtilsSettings): ShapeEntity => {
  switch (shape.type) {
    case 'rect':
    case 'square':
      return refreshRect(shape, settings)
    case 'ellipse':
      return refreshEllipse(shape, settings)
    case 'circle':
      return refreshCircle(shape, settings)
    case 'picture':
      return refreshPicture(shape, settings)
    case 'text':
      return refreshText(shape, settings)
    case 'line':
      return refreshLine(shape, settings)
    case 'polygon':
      return refreshPolygon(shape, settings)
    case 'curve':
      return refreshCurve(shape, settings)
    case 'brush':
      return refreshBrush(shape, settings)
    default:
      return shape
  }
}

export const drawShapeSelection = ({
  ctx,
  shape,
  settings,
  selectionWidth,
  selectionColor,
  hoverMode,
  withAnchors = true
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  settings: UtilsSettings
  selectionWidth: number
  selectionColor: string
  hoverMode: HoverModeData
  withAnchors?: boolean
}) => {
  const { center } = getShapeInfos(shape, settings)
  transformCanvas(ctx, settings, shape.rotation, center)

  switch (shape.type) {
    case 'rect':
    case 'square':
    case 'circle':
    case 'ellipse':
    case 'picture':
    case 'text':
    case 'brush':
      drawSelectionRect(ctx, shape, selectionColor, selectionWidth, settings, hoverMode, withAnchors)
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
        hoverMode,
        settings
      })
      break
  }
  ctx.restore()
}

export const drawSelectionFrame = ({
  ctx,
  selectionFrame,
  settings
}: {
  ctx: CanvasRenderingContext2D
  selectionFrame: [Point, Point]
  settings: UtilsSettings
}) => {
  transformCanvas(ctx, settings)
  drawFrame(ctx, selectionFrame, settings)

  ctx.restore()
}

export const copyShape = (shape: ShapeEntity, settings: UtilsSettings) => {
  return {
    ...translateShape([20, 20], shape, [0, 0], settings, false),
    id: uniqueId(`${shape.type}_`)
  } as ShapeEntity
}
