import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_DEFAULT_WIDTH, SHAPES_KEEPING_RATIO, SHAPES_WITH_ROTATION, STYLE_FIELDS_SHAPE_TYPES } from '@canvas/constants/shapes'
import type { HoverModeData, SelectionModeData, SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, Rect, SelectionType, ShapeEntity, ShapeType, StyleShape } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { createDetachedContext, initCanvasContext, transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { hasVisibleFill, isFillMasked } from '@canvas/utils/fill'
import { getRectIntersection } from '@canvas/utils/intersect'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { buildShapesGroup } from '@canvas/utils/selection'
import { drawSelectionGroup } from '@canvas/utils/selection/groupSelection'
import { drawLineSelection } from '@canvas/utils/selection/lineSelection'
import { drawBoundingBox, drawSelectionRect } from '@canvas/utils/selection/rectSelection'
import { drawFrame } from '@canvas/utils/selection/selectionFrame'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import { getPointsBounds, getRectCorners, rotatePoint } from '@canvas/utils/trigo'
import { createShapeId } from '@canvas/utils/util'
import { getCurrentView } from '@canvas/utils/zoom'
import { createBrush, drawBrush, refreshBrush, resizeBrush, resizeBrushInGroup } from './brush'
import { createCircle, drawCircle, refreshCircle, resizeCircle, resizeCircleInGroup } from './circle'
import { createCurve, drawCurve, refreshCurve, resizeCurve } from './curve'
import { createEllipse, drawEllipse, refreshEllipse, resizeEllipse, resizeEllipseInGroup } from './ellipse'
import { buildGroupResizeContext, type GroupResizeContext, getGroupResizeContext } from './group'
import { createLine, drawLine, refreshLine, resizeLine, resizeLinePolygonCurveInGroup } from './line'
import { expandRect } from './path'
import { drawPicture, hasPictureBorder, refreshPicture, resizePicture, resizePictureInGroup } from './picture'
import { createPolygon, drawPolygon, refreshPolygon, resizePolygon } from './polygon'
import { createRectangle, drawRect, refreshRect, resizeRect, resizeRectInGroup } from './rectangle'
import { createText, drawText, fitTextToStyle, isTextPaintedSeveralTimes, refreshText, resizeText, resizeTextInGroup } from './text'

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
 * Whether the shape must be drawn alone on a layer, then copied with its opacity:
 * - a gradient masked by dots composites over what is under it, which must be empty
 * - drawn with an opacity, the overlaps of several operations would be darker: a fill and a stroke, a stroke thinner
 *   than a pixel, drawn segment by segment, a stroke and its heads, an image and its border, or the lines of a text and
 *   its background, its outline or its decorations. A single operation (a stroke, even of several lines like a hatch, a
 *   fill, an image) is drawn directly
 */
const needsLayer = (shape: ShapeEntity, opacity: number, scaleRatio: number): boolean => {
  if (isFillMasked(shape.style)) return true
  if (opacity === 1) return false
  if (shape.type === 'picture') return hasPictureBorder(shape)
  if (shape.type === 'text') return isTextPaintedSeveralTimes(shape)
  // an undefined stroke color is drawn with the default color
  const hasStroke = shape.style?.strokeColor !== 'transparent'
  if (hasStroke && (shape.style?.lineWidth ?? SELECTION_DEFAULT_WIDTH) * scaleRatio <= 1) return true
  if (hasStroke && 'arrows' in shape && shape.arrows?.length) return true
  if (shape.type === 'line' || shape.type === 'brush') return false
  return hasStroke && hasVisibleFill(shape.style)
}

/**
 * Canvases out of the page, shared by the shapes drawn with their opacity on a canvas, one for each size: once drawn on
 * the canvas, a layer is copied as a whole the next time it is changed, so the smallest layer fitting a shape is used.
 * The layers of a canvas are freed with it, and when its size changes
 */
const layersByCanvas = new WeakMap<HTMLCanvasElement, { width: number; height: number; layers: Map<number, CanvasRenderingContext2D | null> }>()

/** Sizes of the layers: powers of 2, at most the size of the canvas */
const getLayerSize = (size: number, max: number) => Math.min(max, Math.max(32, 2 ** Math.ceil(Math.log2(size))))

const getLayerContext = (width: number, height: number, canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  let canvasLayers = layersByCanvas.get(canvas)
  if (canvasLayers?.width !== canvas.width || canvasLayers.height !== canvas.height) {
    canvasLayers = { width: canvas.width, height: canvas.height, layers: new Map() }
    layersByCanvas.set(canvas, canvasLayers)
  }
  const layerWidth = getLayerSize(width, canvas.width)
  const layerHeight = getLayerSize(height, canvas.height)
  // the sizes of a canvas are below 65536 pixels
  const key = layerWidth * 65536 + layerHeight
  let layer = canvasLayers.layers.get(key)
  if (layer === undefined) {
    layer = createDetachedContext()
    if (layer) {
      layer.canvas.width = layerWidth
      layer.canvas.height = layerHeight
      initCanvasContext(layer)
    }
    canvasLayers.layers.set(key, layer)
  }
  return layer
}

/**
 * Margin around the outer borders of a shape, in the units of the drawing: the glyphs of a text go beyond them. The outer
 * borders of the other shapes hold their stroke and its heads, and the ones of a text the outline of its letters and the
 * letters of its lines lower than its font size
 */
const getLayerMargin = (shape: ShapeEntity) => (shape.type === 'text' ? shape.fontSize / 4 : 0)

/** Margin of the layers in pixels, for the antialiasing */
const LAYER_PIXEL_MARGIN = 2

/** Box in pixels of a rectangle of the shape transformed by the matrix: only its part inside the canvas is drawn */
const getPixelBox = (canvas: HTMLCanvasElement, matrix: DOMMatrix, rect: Rect): Rect => {
  const corners = getRectCorners(rect).map(
    ([cornerX, cornerY]): Point => [matrix.a * cornerX + matrix.c * cornerY + matrix.e, matrix.b * cornerX + matrix.d * cornerY + matrix.f]
  )
  const { minX, minY, maxX, maxY } = getPointsBounds([corners])
  const left = Math.max(0, Math.floor(minX) - LAYER_PIXEL_MARGIN)
  const top = Math.max(0, Math.floor(minY) - LAYER_PIXEL_MARGIN)
  return {
    x: left,
    y: top,
    width: Math.min(canvas.width, Math.ceil(maxX) + LAYER_PIXEL_MARGIN) - left,
    height: Math.min(canvas.height, Math.ceil(maxY) + LAYER_PIXEL_MARGIN) - top
  }
}

/**
 * Draws a shape painted several times, with its opacity: it is painted opaque on a shared layer, at the resolution of the
 * canvas, then the layer is copied with the opacity
 */
const drawShapeOnLayer = (ctx: CanvasRenderingContext2D, shape: ShapeEntity): void => {
  const matrix = ctx.getTransform()
  const box = getPixelBox(ctx.canvas, matrix, expandRect(shape.computed.outerBorders, getLayerMargin(shape)))
  if (box.width <= 0 || box.height <= 0) return
  const layerCtx = getLayerContext(box.width, box.height, ctx.canvas)
  if (!layerCtx) return

  layerCtx.setTransform(1, 0, 0, 1, 0, 0)
  layerCtx.clearRect(0, 0, box.width, box.height)
  // the transformation of the canvas, moved to the corner of the layer
  layerCtx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e - box.x, matrix.f - box.y)
  updateCanvasContext(layerCtx, { ...shape.style, opacity: 100 })
  // the shared layer keeps no state of the shape, like a clip, for the next ones
  layerCtx.save()
  drawShapeByType(layerCtx, shape)
  layerCtx.restore()

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(layerCtx.canvas, 0, 0, box.width, box.height, box.x, box.y, box.width, box.height)
  ctx.restore()
}

const isInView = (shape: ShapeEntity, settings: UtilsSettings, currentView?: Rect): boolean => {
  return !!getRectIntersection(shape.computed.boundingBox, currentView ?? getCurrentView(settings))
}

export const drawShape = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, settings: UtilsSettings, currentView?: Rect): void => {
  if (shape.visible === false) return
  const shouldDraw = isInView(shape, settings, currentView)
  if (!shouldDraw) return

  transformCanvas(ctx, settings, shape.rotation, shape.computed.center)
  updateCanvasContext(ctx, shape.style)

  if (ctx.globalAlpha > 0) {
    if (needsLayer(shape, ctx.globalAlpha, settings.canvasSize.scaleRatio)) drawShapeOnLayer(ctx, shape)
    else drawShapeByType(ctx, shape)
  }

  ctx.restore()
}

/** Draws the shapes from the background, the first of the list in front, the ones out of the view left out */
export const drawShapes = (ctx: CanvasRenderingContext2D, shapes: ShapeEntity[], settings: UtilsSettings): void => {
  const currentView = getCurrentView(settings)
  for (let i = shapes.length - 1; i >= 0; i--) drawShape(ctx, shapes[i]!, settings, currentView)
}

export const rotateShape = <T extends ShapeEntity>(shape: T, rotationToApply: number, selectionCenter: Point): T => {
  if (shape.locked) return shape

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
  if (originalShape.locked) return originalShape

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

/**
 * Whether shapes resized together keep their proportions: a group with a shape keeping its ratio, or with shapes
 * turned differently, cannot be stretched
 */
export const mustKeepRatio = (shapes: ShapeEntity[]): boolean => {
  const shapesWithRotation = shapes.filter(s => SHAPES_WITH_ROTATION.includes(s.type))
  const sameRotation = !shapesWithRotation.some(s => (s.rotation ?? 0) !== (shapesWithRotation[0]?.rotation ?? 0))
  const hasRotationButWithShapesWithoutRotation = (shapesWithRotation[0]?.rotation ?? 0) !== 0 && shapesWithRotation.length !== shapes.length
  const hasShapesWithRatio = shapes.some(s => SHAPES_KEEPING_RATIO.includes(s.type))
  return !sameRotation || hasShapesWithRatio || hasRotationButWithShapesWithoutRotation
}

/** Resizes a shape of a group (or a single shape) to the new borders of the group described by the context */
export const resizeShapeInGroup = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity,
  group: SelectionType,
  groupCtx: GroupResizeContext
): ShapeEntity => {
  if (shape.locked) return shape
  // a single shape is resized as a group of one shape
  const asGroup = group as SelectionType & { type: 'group' }
  switch (shape.type) {
    case 'rect':
    case 'square':
      return resizeRectInGroup(shape, asGroup, groupCtx)
    case 'picture':
      return resizePictureInGroup(shape, asGroup, groupCtx)
    case 'text':
      return resizeTextInGroup(ctx, shape, asGroup, groupCtx)
    case 'ellipse':
      return resizeEllipseInGroup(shape, asGroup, groupCtx)
    case 'circle':
      return resizeCircleInGroup(shape, asGroup, groupCtx)
    case 'brush':
      return resizeBrushInGroup(shape, asGroup, groupCtx)
    case 'line':
    case 'polygon':
    case 'curve':
      return resizeLinePolygonCurveInGroup(shape, asGroup, groupCtx)
    default:
      return shape
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
  const keepRatio = isShiftPressed || mustKeepRatio(groupShapes)

  const groupCtx = getGroupResizeContext(cursorPosition, group, selectionMode as SelectionModeResize, settings, keepRatio, isAltPressed)

  return groupShapes.map(shape =>
    shape.type === 'group'
      ? resizeShape(ctx, cursorPosition, shape, selectionMode, settings, isShiftPressed, isAltPressed) // should not happen
      : resizeShapeInGroup(ctx, shape, group, groupCtx)
  )
}

/** Content box of a selection: its borders without the padding of the selection */
export const getSelectionBounds = (selection: SelectionType, settings: UtilsSettings): Rect => {
  const { borders } = selection.computed
  const padding = settings.selectionPadding
  return { x: borders.x + padding, y: borders.y + padding, width: borders.width - 2 * padding, height: borders.height - 2 * padding }
}

/**
 * Resizes shapes so that the content box of their selection becomes the given box. When they must keep their
 * proportions, the box is reduced to keep them, from its top left corner
 */
export const resizeShapesToBounds = (ctx: CanvasRenderingContext2D, shapes: ShapeEntity[], bounds: Rect, settings: UtilsSettings): ShapeEntity[] => {
  const selection = buildShapesGroup(shapes, settings)
  if (!selection) return shapes
  const current = getSelectionBounds(selection, settings)
  let { width, height } = bounds
  if (mustKeepRatio(shapes) && current.width > 0 && current.height > 0) {
    const scale = Math.min(width / current.width, height / current.height)
    width = current.width * scale
    height = current.height * scale
  }
  const padding = settings.selectionPadding
  const groupCtx = buildGroupResizeContext(
    selection,
    { x: bounds.x - padding, y: bounds.y - padding, width: width + 2 * padding, height: height + 2 * padding },
    settings
  )
  return shapes.map(shape => resizeShapeInGroup(ctx, shape, selection, groupCtx))
}

/** Flips shapes around the center of their group */
export const flipShapes = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  action: 'flipHorizontally' | 'flipVertically',
  settings: UtilsSettings
): ShapeEntity[] => {
  const group = buildShapesGroup(shapes, settings)
  if (!group) return []

  const groupCtx = {
    ...buildGroupResizeContext(group, group.computed.borders, settings, {
      isXinverted: action === 'flipHorizontally',
      isYinverted: action === 'flipVertically',
      rotation: 0 // group rotation is 0 to force flipping single shapes with rotation
    }),
    widthMultiplier: 1,
    heightMultiplier: 1,
    groupCenter: group.computed.center
  }

  return shapes.map(shape => resizeShapeInGroup(ctx, shape, group, groupCtx))
}

export const translateShape = (shape: ShapeEntity, translationX: number, translationY: number, settings: UtilsSettings): ShapeEntity => {
  if (shape.locked) return shape
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

/** A point can only be removed from a polygon or a curve keeping at least 2 points */
export const canRemoveShapePoint = (
  shape: ShapeEntity | undefined,
  pointIndex: number | undefined
): shape is ShapeEntity<'polygon'> | ShapeEntity<'curve'> =>
  (shape?.type === 'polygon' || shape?.type === 'curve') &&
  pointIndex !== undefined &&
  pointIndex >= 0 &&
  pointIndex < shape.points.length &&
  shape.points.length > 2

/** Whether a style field applies to a type of shape, like the font fields to the texts only */
export const isStyleFieldOfShape = (type: ShapeType, field: keyof StyleShape): boolean => STYLE_FIELDS_SHAPE_TYPES[field]?.includes(type) ?? true

/**
 * Returns the shape with the new style values which apply to its type. The font size of a text is fitted to its width
 * when its font changes, and its height to its lines when its line height changes: a shape is returned unchanged when no
 * field applies to it.
 */
export const updateShapeStyle = (ctx: CanvasRenderingContext2D, shape: ShapeEntity, style: StyleShape, settings: UtilsSettings): ShapeEntity => {
  const fields = (Object.keys(style) as (keyof StyleShape)[]).filter(field => isStyleFieldOfShape(shape.type, field))
  if (!fields.length) return shape
  const newShape = { ...shape, style: { ...shape.style, ...Object.fromEntries(fields.map(field => [field, style[field]])) } }
  return refreshShape(newShape.type === 'text' ? fitTextToStyle(ctx, newShape, fields) : newShape, settings)
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

/** Copy of a shape with a new id. The copy does not share the data of the application with the original */
export const cloneShape = <T extends ShapeEntity>(shape: T): T => ({
  ...shape,
  id: createShapeId(shape.type),
  ...(shape.data ? { data: structuredClone(shape.data) } : {})
})

export const copyShapes = (groupShape: SelectionType, settings: UtilsSettings): ShapeEntity[] =>
  getSelectedShapes(groupShape).map(shape => cloneShape(translateShape(shape, 20, 20, settings)))
