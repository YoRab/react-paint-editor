import type { UtilsSettings } from '@canvas/constants/app'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { getRectIntersection } from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selection'
import { drawSelectionGroup } from '@canvas/utils/selection/groupSelection'
import { drawLineSelection } from '@canvas/utils/selection/lineSelection'
import { drawBoundingBox, drawSelectionRect } from '@canvas/utils/selection/rectSelection'
import { drawFrame } from '@canvas/utils/selection/selectionFrame'
import { roundForGrid, roundRotationForGrid } from '@canvas/utils/transform'
import { getCurrentView } from '@canvas/utils/zoom'
import type { HoverModeData, SelectionModeData, SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { createBrush, drawBrush, getComputedBrush, refreshBrush, resizeBrush, translateBrush } from './brush'
import { createCircle, drawCircle, getComputedCircle, refreshCircle, resizeCircle, translateCircle } from './circle'
import { createCurve, drawCurve, getComputedCurve, refreshCurve, resizeCurve, translateCurve } from './curve'
import { createEllipse, drawEllipse, getComputedEllipse, refreshEllipse, resizeEllipse, translateEllipse } from './ellipse'
import { createLine, drawLine, getComputedLine, refreshLine, resizeLine, translateLine } from './line'
import { drawPicture, getComputedPicture, refreshPicture, resizePicture, translatePicture } from './picture'
import { createPolygon, drawPolygon, getComputedPolygon, refreshPolygon, resizePolygon, translatePolygon } from './polygon'
import { createRectangle, drawRect, getComputedRect, refreshRect, resizeRect, translateRect } from './rectangle'
import { createText, drawText, getComputedText, refreshText, resizeText, translateText } from './text'

export const createShape = (
  ctx: CanvasRenderingContext2D,
  shape: Exclude<CustomTool, { type: 'picture' }>,
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity | undefined => {
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
 */
const drawShapeWithOpacity = (ctx: CanvasRenderingContext2D, shape: DrawableShape): void => {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('No context found for canvas')
  const { outerBorders } = shape.computed
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

export const isInView = (shape: DrawableShape, settings: UtilsSettings): boolean => {
  const currentView = getCurrentView(settings)
  return !!getRectIntersection(shape.computed.boundingBox, currentView)
}

export const drawShape = (ctx: CanvasRenderingContext2D, shape: DrawableShape, settings: UtilsSettings): void => {
  if (shape.visible === false) return

  const shouldDraw = isInView(shape, settings)
  if (!shouldDraw) return

  transformCanvas(ctx, settings, shape.rotation, shape.computed.center)
  updateCanvasContext(ctx, shape.style)

  if (ctx.globalAlpha !== 1) {
    drawShapeWithOpacity(ctx, shape)
    ctx.restore()
    return
  }
  drawShapeByType(ctx, shape)

  ctx.restore()
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
  const rotatedShape: T = {
    ...shape,
    rotation: roundRotationForGrid(originalShape.rotation + Math.atan2(p2y, p2x) - Math.atan2(p1y, p1x), settings, isShiftPressed)
  }
  return {
    ...rotatedShape,
    computed: getShapeComputedData(rotatedShape, settings)
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

export const translateShapes = (
  cursorPosition: Point,
  originalShape: SelectionType,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  isShiftPressed: boolean
): ShapeEntity[] => {
  return getSelectedShapes(originalShape).map(shape => translateShape(cursorPosition, shape, originalCursorPosition, settings, isShiftPressed))
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

export const getShapeComputedData = (shape: DrawableShape, settings: UtilsSettings) => {
  switch (shape.type) {
    case 'rect':
    case 'square':
      return getComputedRect(shape, settings)
    case 'ellipse':
      return getComputedEllipse(shape, settings)
    case 'circle':
      return getComputedCircle(shape, settings)
    case 'picture':
      return getComputedPicture(shape, settings)
    case 'text':
      return getComputedText(shape, settings)
    case 'line':
      return getComputedLine(shape, settings)
    case 'polygon':
      return getComputedPolygon(shape, settings)
    case 'curve':
      return getComputedCurve(shape, settings)
    case 'brush':
      return getComputedBrush(shape, settings)
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
  shape: SelectionType
  settings: UtilsSettings
  selectionWidth: number
  selectionColor: string
  hoverMode: HoverModeData
  withAnchors?: boolean
}) => {
  const { center } = shape.computed
  if (settings.debug) drawBoundingBox(ctx, shape, selectionWidth, settings)
  transformCanvas(ctx, settings, shape.rotation, center)

  switch (shape.type) {
    case 'rect':
    case 'square':
    case 'circle':
    case 'ellipse':
    case 'picture':
    case 'text':
    case 'brush':
      drawSelectionRect(ctx, shape, selectionColor, selectionWidth, settings, withAnchors)
      break
    case 'group':
      drawSelectionGroup(ctx, shape, selectionColor, selectionWidth, settings, withAnchors)
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
  selectionFrame: { oldSelection: SelectionType | undefined; frame: [Point, Point] }
  settings: UtilsSettings
}) => {
  transformCanvas(ctx, settings)
  drawFrame(ctx, selectionFrame.frame, settings)

  ctx.restore()
}

export const copyShapes = (groupShape: SelectionType, settings: UtilsSettings): ShapeEntity[] => {
  return getSelectedShapes(groupShape).map(shape => {
    return {
      ...translateShape([20, 20], shape, [0, 0], settings, false),
      id: uniqueId(`${shape.type}_`)
    }
  })
}
