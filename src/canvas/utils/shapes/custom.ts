import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { CustomShapeDefinition, CustomShapeParams, DrawableShape, Point, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { drawPathWithFillAndStroke } from '@canvas/utils/fill'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { createShapeId } from '@canvas/utils/util'
import { type GroupResizeContext, getMirroredRotation, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'
import { getComputedShapeInfos, getSharpOuterBorder } from './path'
import { getRectBorder } from './rectangle'

/** A tool drawing custom shapes, which carries their geometry */
type CustomShapeTool = Extract<CustomTool, { type: 'custom' }>

/**
 * The definition of a custom shape whose tool is gone: it draws nothing, and keeps its box. A shape of a loaded drawing
 * is left out before it comes to this, and one given to addShapes is refused
 */
export const MISSING_CUSTOM_DEFINITION: CustomShapeDefinition = { viewBox: [0, 0, 1, 1], path: '' }

/**
 * The tool of a custom shape, which carries its geometry: it is found by an exact id, never by its type like
 * findShapeTool does, or a shape whose tool is gone would silently take the path of another custom tool
 */
export const findCustomShapeTool = (tools: CustomTool[], toolId: string | undefined): CustomShapeTool | undefined =>
  tools.find((tool): tool is CustomShapeTool => tool.type === 'custom' && tool.id === toolId)

/** The ids of the tools drawing custom shapes, to check the shapes given by the consumer */
export const getCustomShapeToolIds = (tools: CustomTool[]): ReadonlySet<string> =>
  new Set(tools.filter(tool => tool.type === 'custom').map(tool => tool.id))

/** The error of a custom shape given with the id of a tool which draws none, when the ids of the tools are known */
export const getCustomToolError = (toolId: unknown, customToolIds: ReadonlySet<string> | undefined): string | undefined =>
  customToolIds && !customToolIds.has(toolId as string) ? `no custom tool "${String(toolId)}" draws this shape` : undefined

/** The path data of a definition, built from the parameters of the shape when it needs them: empty when it throws */
const getPathData = (definition: CustomShapeDefinition, params: CustomShapeParams | undefined): string => {
  if (typeof definition.path === 'string') return definition.path
  try {
    return definition.path(params ?? {})
  } catch (error) {
    console.warn('react-paint: the path of a custom shape could not be built', error)
    return ''
  }
}

/**
 * Maps the view box of the definition onto the box of the shape, mirrored by its flips. It is given to addPath, so that
 * the path of the shape is drawn, hit tested and searched in the coordinates of the drawing, flips included
 */
const getPathMatrix = (shape: DrawableShape<'custom'>): DOMMatrix2DInit => {
  const [boxX, boxY, boxWidth, boxHeight] = shape.definition.viewBox
  const scaleX = (boxWidth === 0 ? 0 : shape.width / boxWidth) * (shape.flipX ? -1 : 1)
  const scaleY = (boxHeight === 0 ? 0 : shape.height / boxHeight) * (shape.flipY ? -1 : 1)
  return {
    a: scaleX,
    b: 0,
    c: 0,
    d: scaleY,
    e: shape.x + (shape.flipX ? shape.width : 0) - boxX * scaleX,
    f: shape.y + (shape.flipY ? shape.height : 0) - boxY * scaleY
  }
}

const buildPath = (shape: DrawableShape<'custom'> & { id: string }, settings: UtilsSettings): ShapeEntity<'custom'> => {
  const data = getPathData(shape.definition, shape.params)
  const path = new Path2D()
  // a shape of a definition which draws nothing keeps its box, and its selection
  if (data) path.addPath(new Path2D(data), getPathMatrix(shape))
  // the borders are its box, not the bounds of its path: the view box of a definition must be what its path draws
  const computed = getComputedShapeInfos(shape, getRectBorder, settings, getSharpOuterBorder)
  return {
    ...shape,
    path,
    computed
  }
}

export const refreshCustomShape = buildPath

/** The values the parameters of a custom tool take in a new shape */
const getDefaultParams = (tool: CustomShapeTool): CustomShapeParams | undefined => {
  const declarations = tool.settings.params
  if (!declarations) return undefined
  const params: CustomShapeParams = {}
  for (const [name, declaration] of Object.entries(declarations)) params[name] = declaration.default
  return params
}

export const createCustomShape = (tool: CustomShapeTool, cursorPosition: Point, settings: UtilsSettings): ShapeEntity<'custom'> => {
  const [, , boxWidth, boxHeight] = tool.shape.viewBox
  const params = getDefaultParams(tool)
  return buildPath(
    {
      toolId: tool.id,
      type: 'custom',
      id: createShapeId('custom'),
      x: cursorPosition[0],
      y: cursorPosition[1],
      width: 0,
      height: 0,
      definition: tool.shape,
      ...(tool.shape.keepRatio ? { ratio: boxHeight === 0 ? 1 : boxWidth / boxHeight } : {}),
      ...(params ? { params } : {}),
      style: getToolDefaultStyle(tool)
    },
    settings
  )
}

export const drawCustomShape = (ctx: CanvasRenderingContext2D, shape: ShapeEntity<'custom'>): void => {
  drawPathWithFillAndStroke(ctx, shape)
}

export const resizeCustomShape = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'custom'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  keepRatio: boolean,
  resizeFromCenter: boolean
): ShapeEntity<'custom'> => {
  const { borderX, borderHeight, borderY, borderWidth, isXinverted, isYinverted } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    keepRatio,
    resizeFromCenter
  )
  return buildPath(
    {
      ...originalShape,
      width: Math.max(0, borderWidth - 2 * settings.selectionPadding),
      height: Math.max(0, borderHeight - 2 * settings.selectionPadding),
      x: borderX + settings.selectionPadding,
      y: borderY + settings.selectionPadding,
      flipX: isXinverted ? !originalShape.flipX : !!originalShape.flipX,
      flipY: isYinverted ? !originalShape.flipY : !!originalShape.flipY
    },
    settings
  )
}

export const resizeCustomShapeInGroup = (shape: ShapeEntity<'custom'>, groupCtx: GroupResizeContext): ShapeEntity<'custom'> => {
  const { isXinverted, isYinverted, settings, widthMultiplier, heightMultiplier } = groupCtx
  const pos = getShapePositionInNewBorder(shape, groupCtx)
  const newWidth = (shape.width || 1) * widthMultiplier
  const newHeight = (shape.height || 1) * heightMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newWidth, newHeight)
  return buildPath(
    {
      ...shape,
      width: newWidth,
      height: newHeight,
      x: newCenter[0] - newWidth / 2,
      y: newCenter[1] - newHeight / 2,
      flipX: isXinverted ? !shape.flipX : !!shape.flipX,
      flipY: isYinverted ? !shape.flipY : !!shape.flipY,
      rotation: getMirroredRotation(shape.rotation, groupCtx)
    },
    settings
  )
}
