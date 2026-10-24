import type { UtilsSettings } from '@canvas/constants/app'
import { STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT } from '@canvas/constants/rendering'
import { FONT_STYLE_FIELDS } from '@canvas/constants/shapes'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, Rect, SelectionType, ShapeEntity, StyleShape, Text, TextAlign, TextShapeInput } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { getToolDefaultStyle } from '@canvas/utils/tools'
import { createShapeId } from '@canvas/utils/util'
import { type GroupResizeContext, getPositionWithoutGroupRotation, getShapePositionInNewBorder } from './group'
import { createRecPath, expandRect, getComputedShapeInfos } from './path'
import { getRectOppositeAnchorAbsolutePosition } from './rectangle'

const DEFAULT_TEXT_VALUE: string[] = ['Texte']
const DEFAULT_TEXT_WIDTH = 150

/** Position of the lines in the box of a text, from its left side (0) to its right side (1), for each alignment */
const TEXT_ALIGN_POSITIONS: Record<TextAlign, number> = { left: 0, center: 0.5, right: 1 }

export const getComputedText = (text: DrawableShape<'text'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(text, getTextBorder, settings)
}

const buildPath = <T extends DrawableShape<'text'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'text'> => {
  const computed = getComputedText(shape, settings)
  const path = createRecPath(shape)

  return {
    ...shape,
    path,
    computed
  }
}

export const refreshText = buildPath

/** A text without lines, emptied in the edition box, keeps the height of one */
export const getTextLineCount = (value: string[]) => value.length || 1

/** Width of the widest line at the font size, 0 for a text without characters */
const measureWidestLine = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  fontSize: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined = STYLE_FONT_DEFAULT
) => {
  ctx.font = `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} ${fontSize}px ${fontFamily}`
  return Math.max(0, ...text.map((value: string) => ctx.measureText(value).width))
}

export const calculateTextFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  maxWidth: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily?: string
) => {
  const fontSize = maxWidth / measureWidestLine(ctx, text, 1, fontBold, fontItalic, fontFamily)
  // a text without characters measures 0 and gives an infinite size: it gets the default size
  return Number.isFinite(fontSize) && fontSize !== 0 ? fontSize : STYLE_FONT_SIZE_DEFAULT
}

export const isFontStyleField = (field: keyof StyleShape) => FONT_STYLE_FIELDS.includes(field)

export const fitTextFontSize = <T extends DrawableShape<'text'>>(ctx: CanvasRenderingContext2D, text: T): T => {
  const fontSize = calculateTextFontSize(
    ctx,
    text.value,
    text.width,
    text.style?.fontBold ?? false,
    text.style?.fontItalic ?? false,
    text.style?.fontFamily
  )
  const height = fontSize * getTextLineCount(text.value)
  return { ...text, fontSize, height, ratio: text.width / height }
}

/** Completes the size of a text which misses it: from its width, from its font size, or else with the default font size */
export const sizeText = <T extends TextShapeInput>(ctx: CanvasRenderingContext2D, text: T): T & DrawableShape<'text'> => {
  type SizedText = T & DrawableShape<'text'>
  if (text.width !== undefined && text.height !== undefined && text.fontSize !== undefined) return text as SizedText
  if (text.width !== undefined && text.fontSize === undefined) return fitTextFontSize(ctx, text as SizedText)
  const { fontBold = false, fontItalic = false, fontFamily } = text.style ?? {}
  const lines = getTextLineCount(text.value)
  const fontSize = text.fontSize ?? (text.height !== undefined ? text.height / lines : STYLE_FONT_SIZE_DEFAULT)
  const width = text.width ?? calculateTextWidth(ctx, text.value, fontSize, fontBold, fontItalic, fontFamily)
  const height = text.height ?? fontSize * lines
  return { ...text, fontSize, width, height, ratio: width / height } as SizedText
}

export const createText = (
  ctx: CanvasRenderingContext2D,
  shape: {
    id: string
    type: 'text'
    settings: ToolsSettingsType<'text'>
  },
  cursorPosition: Point,
  settings: UtilsSettings
): ShapeEntity<'text'> => {
  const style = getToolDefaultStyle(shape)
  // the text is as wide as its content at the font size of the tool, or else its font fills the default width
  const toolFontSize = shape.settings.fontSize?.default
  const { fontSize, width, height } = sizeText(ctx, {
    type: 'text',
    x: 0,
    y: 0,
    value: DEFAULT_TEXT_VALUE,
    style,
    ...(toolFontSize === undefined ? { width: DEFAULT_TEXT_WIDTH } : { fontSize: toolFontSize })
  })
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: createShapeId(shape.type),
      x: cursorPosition[0] - width,
      y: cursorPosition[1] - height,
      value: DEFAULT_TEXT_VALUE,
      fontSize,
      width,
      height,
      ratio: width / height,
      style
    },
    settings
  )
}

export const drawText = (ctx: CanvasRenderingContext2D, text: DrawableShape<'text'>): void => {
  if (ctx.globalAlpha === 0 || !text.style?.strokeColor || text.style.strokeColor === 'transparent') return
  ctx.scale(text.flipX ? -1 : 1, text.flipY ? -1 : 1)

  ctx.font = `${text.style?.fontItalic ? 'italic' : ''} ${text.style?.fontBold ? 'bold' : ''} ${text.fontSize}px ${
    text.style?.fontFamily ?? STYLE_FONT_DEFAULT
  }`
  ctx.textBaseline = 'top'
  const textAlign = text.style.textAlign ?? 'left'
  ctx.textAlign = textAlign
  ctx.fillStyle = text.style.strokeColor
  // a flipped text is drawn in the flipped space, where its box starts at -x - width
  const x = (text.flipX ? -text.x - text.width : text.x) + text.width * TEXT_ALIGN_POSITIONS[textAlign]
  for (let i = 0; i < text.value.length; i++) {
    ctx.fillText(text.value[i]!, x, (text.flipY ? -text.y - text.height : text.y) + i * text.fontSize, text.width)
  }
}

export const getTextBorder = (text: Text, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  const baseRect: Rect = {
    x: text.x,
    y: text.y,
    width: text.width,
    height: text.height
  }
  return expandRect(baseRect, settings.selectionPadding)
}

export const resizeText = (
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  originalShape: ShapeEntity<'text'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  resizeFromCenter: boolean
): ShapeEntity<'text'> => {
  const { borderX, borderHeight, borderY, borderWidth, isXinverted, isYinverted } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    true,
    resizeFromCenter
  )

  const width = Math.max(0, borderWidth - 2 * settings.selectionPadding)
  const height = Math.max(0, borderHeight - 2 * settings.selectionPadding)

  const newRect = buildPath(
    {
      ...originalShape,
      width,
      height,
      x: borderX + settings.selectionPadding,
      y: borderY + settings.selectionPadding,
      flipX: isXinverted ? !originalShape.flipX : !!originalShape.flipX,
      flipY: isYinverted ? !originalShape.flipY : !!originalShape.flipY
    },
    settings
  )

  return {
    ...newRect,
    fontSize: calculateTextFontSize(
      ctx,
      newRect.value,
      newRect.width,
      newRect.style?.fontBold ?? false,
      newRect.style?.fontItalic ?? false,
      newRect.style?.fontFamily
    )
  } as ShapeEntity<'text'>
}

export const resizeTextInGroup = (
  canvasCtx: CanvasRenderingContext2D,
  shape: ShapeEntity<'text'>,
  group: SelectionType & { type: 'group' },
  groupCtx: GroupResizeContext
): ShapeEntity<'text'> => {
  const { isXinverted, isYinverted, settings, widthMultiplier, heightMultiplier } = groupCtx
  const shouldFlipRotation =
    (isXinverted || isYinverted) && !(isXinverted && isYinverted) && (shape.rotation ?? 0) !== 0 && groupCtx.rotation !== shape.rotation
  const pos = getShapePositionInNewBorder(shape, group, groupCtx)
  const newWidth = (shape.width === 0 || shape.height === 0 ? (shape.ratio ?? 1) : shape.width) * widthMultiplier
  const newHeight = (shape.width === 0 || shape.height === 0 ? (shape.ratio ?? 1) : shape.height) * heightMultiplier
  const newCenter = getPositionWithoutGroupRotation(groupCtx, pos.x, pos.y, newWidth, newHeight)
  const refreshedShape = buildPath(
    {
      ...shape,
      width: newWidth,
      height: newHeight,
      x: newCenter[0] - newWidth / 2,
      y: newCenter[1] - newHeight / 2,
      flipX: isXinverted ? !shape.flipX : !!shape.flipX,
      flipY: isYinverted ? !shape.flipY : !!shape.flipY,
      rotation: shouldFlipRotation ? -(shape.rotation ?? 0) : (shape.rotation ?? 0)
    },
    settings
  )
  return {
    ...refreshedShape,
    fontSize: calculateTextFontSize(
      canvasCtx,
      refreshedShape.value,
      refreshedShape.width,
      refreshedShape.style?.fontBold ?? false,
      refreshedShape.style?.fontItalic ?? false,
      refreshedShape.style?.fontFamily
    )
  }
}

const calculateTextWidth = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  fontSize: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily?: string
) => measureWidestLine(ctx, text, fontSize, fontBold, fontItalic, fontFamily) || 20

export const resizeTextShapeWithNewContent = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity<'text'>,
  newValue: string[],
  settings: UtilsSettings
): ShapeEntity<'text'> => {
  const newShape = { ...shape, value: newValue }
  const newWidth = calculateTextWidth(
    ctx,
    newShape.value,
    newShape.fontSize,
    newShape.style?.fontBold ?? false,
    newShape.style?.fontItalic ?? false,
    newShape.style?.fontFamily
  )
  const newHeight = newShape.fontSize * getTextLineCount(newShape.value)

  const ratio = newWidth / newHeight

  const resizedShape = {
    ...newShape,
    width: newWidth,
    height: newHeight,
    ratio
  }

  const { center: shapeWithNewDimensionsCenter } = getComputedText(resizedShape, settings)

  // the text keeps the top of the side of its alignment, or the top of its middle, the anchor being the opposite one
  const anchor: Point = [1 - TEXT_ALIGN_POSITIONS[shape.style?.textAlign ?? 'left'], 1]
  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(anchor, shape.computed.center, shape)

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(anchor, shapeWithNewDimensionsCenter, resizedShape, [false, false])

  return {
    ...resizedShape,
    x: resizedShape.x - (newOppTrueX - oppTrueX),
    y: resizedShape.y - (newOppTrueY - oppTrueY)
  }
}
