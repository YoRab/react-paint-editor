import type { UtilsSettings } from '@canvas/constants/app'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { getRectIntersection } from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selection'
import { drawSelectionGroup } from '@canvas/utils/selection/groupSelection'
import { drawLineSelection } from '@canvas/utils/selection/lineSelection'
import { drawBoundingBox, drawSelectionRect } from '@canvas/utils/selection/rectSelection'
import { drawFrame } from '@canvas/utils/selection/selectionFrame'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import { rotatePoint } from '@canvas/utils/trigo'
import { getCurrentView } from '@canvas/utils/zoom'
import type { HoverModeData, SelectionModeData, SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { createBrush, drawBrush, getComputedBrush, refreshBrush, resizeBrush, resizeBrushInGroup } from './brush'
import { createCircle, drawCircle, getComputedCircle, refreshCircle, resizeCircle, resizeCircleInGroup } from './circle'
import { createCurve, drawCurve, getComputedCurve, refreshCurve, resizeCurve } from './curve'
import { createEllipse, drawEllipse, getComputedEllipse, refreshEllipse, resizeEllipse, resizeEllipseInGroup } from './ellipse'
import { getGroupResizeContext } from './group'
import { createLine, drawLine, getComputedLine, refreshLine, resizeLine, resizeLinePolygonCurveInGroup } from './line'
import { drawPicture, getComputedPicture, refreshPicture, resizePicture, resizePictureInGroup } from './picture'
import { createPolygon, drawPolygon, getComputedPolygon, refreshPolygon, resizePolygon } from './polygon'
import { createRectangle, drawRect, getComputedRect, refreshRect, resizeRect, resizeRectInGroup } from './rectangle'
import { createText, drawText, getComputedText, refreshText, resizeText, resizeTextInGroup } from './text'
import { SHAPES_KEEPING_RATIO, SHAPES_WITH_ROTATION } from '@canvas/constants/shapes'

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

const drawShapeByType = (ctx: CanvasRenderingContext2D, shape: ShapeEntity): void => {
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
const drawShapeWithOpacity = (ctx: CanvasRenderingContext2D, shape: ShapeEntity): void => {
  const { outerBorders } = shape.computed
  const tempCanvasSize = {
    width: outerBorders.width * 2,
    height: outerBorders.height * 2
  }
  if (tempCanvasSize.width === 0 || tempCanvasSize.height === 0) return
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('No context found for canvas')
  tempCanvas.width = tempCanvasSize.width
  tempCanvas.height = tempCanvasSize.height
  tempCtx.translate(tempCanvasSize.width / 4 - outerBorders.x, tempCanvasSize.height / 4 - outerBorders.y)
  updateCanvasContext(tempCtx, { ...shape.style, opacity: 100 })

  drawShapeByType(tempCtx, shape)

  ctx.drawImage(tempCanvas, outerBorders.x - tempCanvasSize.width / 4, outerBorders.y - tempCanvasSize.height / 4)
}

export const isInView = (shape: ShapeEntity, settings: UtilsSettings): boolean => {
  const currentView = getCurrentView(settings)
  return !!getRectIntersection(shape.computed.boundingBox, currentView)
}

export const drawShape = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, settings: UtilsSettings): void => {
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

export const rotateShape = <T extends ShapeEntity>(shape: T, rotationToApply: number, selectionCenter: Point): T => {
  const rotatedCenter = rotatePoint({ origin: selectionCenter, point: shape.computed.center, rotation: -rotationToApply })

  if ('points' in shape) {
    if (shape.type === 'brush') {
      const points: Point[][] = shape.points.map(pointGroup =>
        pointGroup.map(point => [point[0] + rotatedCenter[0] - shape.computed.center[0], point[1] + rotatedCenter[1] - shape.computed.center[1]])
      )
      return {
        ...shape,
        points,
        rotation: (shape.rotation ?? 0) + rotationToApply
      }
    }
    const points = shape.points.map(point => rotatePoint({ origin: selectionCenter, point: point, rotation: -rotationToApply }))
    return {
      ...shape,
      points
    }
  }

  return {
    ...shape,
    x: shape.x + rotatedCenter[0] - shape.computed.center[0],
    y: shape.y + rotatedCenter[1] - shape.computed.center[1],
    rotation: (shape.rotation ?? 0) + rotationToApply
  }
}

export const resizeShape = <T extends ShapeEntity>(
  ctx: CanvasRenderingContext2D,
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
        originalShape.type === 'square' || isShiftPressed,
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

export const resizeShapes = (
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  originalShape: SelectionType,
  selectionMode: SelectionModeResize<Point | number>,
  settings: UtilsSettings,
  isShiftPressed: boolean,
  isAltPressed: boolean
): ShapeEntity[] => {
  if (originalShape.type !== 'group') {
    return getSelectedShapes(originalShape).map(shape =>
      resizeShape(ctx, cursorPosition, shape, selectionMode, settings, isShiftPressed, isAltPressed)
    )
  }

  const group = originalShape
  const groupShapes = getSelectedShapes(group)
  const shapesWithRotation = groupShapes.filter(s => SHAPES_WITH_ROTATION.includes(s.type))
  const sameRotation = !shapesWithRotation.some(s => (s.rotation ?? 0) !== (shapesWithRotation[0]?.rotation ?? 0))
  const hasRotationButWithShapesWithoutRotation = (shapesWithRotation[0]?.rotation ?? 0) !== 0 && shapesWithRotation.length !== groupShapes.length
  const hasShapesWithRatio = groupShapes.some(s => SHAPES_KEEPING_RATIO.includes(s.type))
  const keepRatio = isShiftPressed || !sameRotation || hasShapesWithRatio || hasRotationButWithShapesWithoutRotation

  const groupCtx = getGroupResizeContext(cursorPosition, group, selectionMode as SelectionModeResize, settings, keepRatio, isAltPressed)

  return groupShapes.map(shape => {
    switch (shape.type) {
      case 'rect':
      case 'square':
        return resizeRectInGroup(shape, group, groupCtx)
      case 'picture':
        return resizePictureInGroup(shape, group, groupCtx)
      case 'text':
        return resizeTextInGroup(ctx, shape, group, groupCtx)
      case 'ellipse':
        return resizeEllipseInGroup(shape, group, groupCtx)
      case 'circle':
        return resizeCircleInGroup(shape, group, groupCtx)
      case 'brush':
        return resizeBrushInGroup(shape, group, groupCtx)
      case 'line':
      case 'polygon':
      case 'curve':
        return resizeLinePolygonCurveInGroup(shape, group, groupCtx)
      default: // group, should not happen
        return resizeShape(ctx, cursorPosition, shape, selectionMode, settings, isShiftPressed, isAltPressed)
    }
  })
}

const translateShape = (shape: ShapeEntity, translationX: number, translationY: number, settings: UtilsSettings): ShapeEntity => {
  switch (shape.type) {
    case 'rect':
    case 'square':
    case 'ellipse':
    case 'circle':
    case 'picture':
    case 'text':
      return refreshShape(
        {
          ...shape,
          x: shape.x + translationX,
          y: shape.y + translationY
        },
        settings
      )

    case 'line':
    case 'polygon':
    case 'curve':
      return refreshShape(
        {
          ...shape,
          points: shape.points.map(([x, y]) => [x + translationX, y + translationY]) as [Point, Point]
        },
        settings
      )
    case 'brush':
      return refreshShape(
        {
          ...shape,
          points: shape.points.map(coord => coord.map(([x, y]) => [x + translationX, y + translationY])) as Point[][]
        },
        settings
      )
    default:
      return shape
  }
}

export const translateShapes = (
  cursorPosition: Point,
  originalShape: SelectionType,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  isShiftPressed: boolean
): ShapeEntity[] => {
  const originalBorders = originalShape.computed.borders
  const translationVector = boundVectorToSingleAxis(
    [cursorPosition[0] - originalCursorPosition[0], cursorPosition[1] - originalCursorPosition[1]],
    isShiftPressed
  )
  const translationX =
    translationVector[0] === 0
      ? 0
      : roundForGrid(originalBorders.x + settings.selectionPadding + translationVector[0], settings) - (originalBorders.x + settings.selectionPadding)
  const translationY =
    translationVector[1] === 0
      ? 0
      : roundForGrid(originalBorders.y + settings.selectionPadding + translationVector[1], settings) - (originalBorders.y + settings.selectionPadding)

  return getSelectedShapes(originalShape).map(shape => {
    return translateShape(shape, translationX, translationY, settings)
  })
}

export const refreshShape = (shape: DrawableShape & { id: string }, settings: UtilsSettings): ShapeEntity => {
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
      return shape as never
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
  selectionMode,
  withAnchors = true
}: {
  ctx: CanvasRenderingContext2D
  shape: SelectionType
  settings: UtilsSettings
  selectionWidth: number
  selectionColor: string
  hoverMode: HoverModeData
  selectionMode: SelectionModeData<number | Point>
  withAnchors?: boolean
}) => {
  if (settings.debug) drawBoundingBox(ctx, shape, selectionWidth, settings)

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
      drawSelectionGroup(ctx, shape, selectionColor, selectionWidth, selectionMode, settings, withAnchors)
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
      ...translateShape(shape, 20, 20, settings),
      id: uniqueId(`${shape.type}_`)
    }
  })
}
