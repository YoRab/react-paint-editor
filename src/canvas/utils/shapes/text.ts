import type { UtilsSettings } from '@canvas/constants/app'
import { STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT, STYLE_OUTLINE_WIDTH_DEFAULT } from '@canvas/constants/rendering'
import { FONT_STYLE_FIELDS } from '@canvas/constants/shapes'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { DrawableShape, Point, Rect, SelectionType, ShapeEntity, StyleShape, Text, TextAlign, TextShapeInput } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { isVisibleColor } from '@canvas/utils/canvas'
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

/** Positions of the middle of the underline and of the strikethrough from the top of a line, and their thickness, in em */
const TEXT_UNDERLINE_POSITION = 0.9
const TEXT_STRIKETHROUGH_POSITION = 0.55
export const TEXT_DECORATION_THICKNESS = 1 / 15

/** The background of a text fills its selection frame: its box with the selection padding */
const hasTextBackground = (text: DrawableShape<'text'>) => isVisibleColor(text.style?.fillColor)

/** How far the outline of a text goes around its letters, 0 without outline */
const getTextOutlineWidth = (text: DrawableShape<'text'>) =>
  isVisibleColor(text.style?.outlineColor) ? Math.max(0, text.style?.outlineWidth ?? STYLE_OUTLINE_WIDTH_DEFAULT) : 0

/**
 * What is painted for a text, on the canvas and in its edition box, in this order: its background, the outline of its
 * letters, its letters, then the lines under and through them. The strokeColor of a text is the color of its letters, and
 * of these lines
 */
export const getTextPaints = (text: DrawableShape<'text'>) => {
  const letters = isVisibleColor(text.style?.strokeColor)
  return {
    background: hasTextBackground(text),
    outlineWidth: getTextOutlineWidth(text),
    letters,
    underline: letters && !!text.style?.fontUnderline,
    strikethrough: letters && !!text.style?.fontStrikethrough
  }
}

/** Whether a text is painted several times: several of its paints, or several lines of letters, which can overlap */
export const isTextPaintedSeveralTimes = (text: DrawableShape<'text'>) => {
  const { background, outlineWidth, letters, underline, strikethrough } = getTextPaints(text)
  const hasGlyphs = letters || outlineWidth > 0
  return [background, outlineWidth > 0, letters, underline || strikethrough].filter(Boolean).length > 1 || (hasGlyphs && text.value.length > 1)
}

/** The outer borders of a text hold the outline of its letters, which goes beyond its box */
const getTextOuterBorder = (text: DrawableShape<'text'>, borders: Rect, settings: Pick<UtilsSettings, 'selectionPadding'>) =>
  expandRect(borders, Math.max(0, getTextOutlineWidth(text) - settings.selectionPadding))

export const getComputedText = (text: DrawableShape<'text'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(text, getTextBorder, settings, getTextOuterBorder)
}

const buildPath = <T extends DrawableShape<'text'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'text'> => {
  const computed = getComputedText(shape, settings)
  // a text is clicked on its box, or on its background
  const path = createRecPath(hasTextBackground(shape) ? computed.borders : shape)

  return {
    ...shape,
    path,
    computed
  }
}

export const refreshText = buildPath

/** A text without lines, emptied in the edition box, keeps the height of one */
export const getTextLineCount = (value: string[]) => value.length || 1

/** Font of the canvas for a text */
const getTextFont = (fontSize: number, fontBold: boolean | undefined, fontItalic: boolean | undefined, fontFamily = STYLE_FONT_DEFAULT) =>
  `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} ${fontSize}px ${fontFamily}`

/** Width of the widest line at the font size, 0 for a text without characters */
const measureWidestLine = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  fontSize: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined
) => {
  ctx.font = getTextFont(fontSize, fontBold, fontItalic, fontFamily)
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

/** Completes the size of a text which misses it: from its width, from its font size, or else with the given default font size */
export const sizeText = <T extends TextShapeInput>(
  ctx: CanvasRenderingContext2D,
  text: T,
  defaultFontSize = STYLE_FONT_SIZE_DEFAULT
): T & DrawableShape<'text'> => {
  type SizedText = T & DrawableShape<'text'>
  if (text.width !== undefined && text.height !== undefined && text.fontSize !== undefined) return text as SizedText
  if (text.width !== undefined && text.fontSize === undefined) return fitTextFontSize(ctx, text as SizedText)
  const { fontBold = false, fontItalic = false, fontFamily } = text.style ?? {}
  const lines = getTextLineCount(text.value)
  const fontSize = text.fontSize ?? (text.height !== undefined ? text.height / lines : defaultFontSize)
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

/** Draws the paints of a text: its background, the outline of its letters, its letters, then the lines under and through them */
export const drawText = (ctx: CanvasRenderingContext2D, text: ShapeEntity<'text'>): void => {
  if (ctx.globalAlpha === 0) return
  const { style = {} } = text
  const { background, outlineWidth, letters, underline, strikethrough } = getTextPaints(text)
  // the path of a text with a background is the background, filled with the fill color of the style of the shape
  if (background) ctx.fill(text.path)
  if (!letters && outlineWidth === 0) return

  ctx.scale(text.flipX ? -1 : 1, text.flipY ? -1 : 1)
  // a flipped text is drawn in the flipped space, where its box starts at -x - width
  const boxLeft = text.flipX ? -text.x - text.width : text.x
  const boxTop = text.flipY ? -text.y - text.height : text.y
  ctx.font = getTextFont(text.fontSize, style.fontBold, style.fontItalic, style.fontFamily)
  ctx.textBaseline = 'top'
  const textAlign = style.textAlign ?? 'left'
  const alignPosition = TEXT_ALIGN_POSITIONS[textAlign]
  ctx.textAlign = textAlign
  const x = boxLeft + text.width * alignPosition
  const getLineTop = (index: number) => boxTop + index * text.fontSize

  if (outlineWidth > 0) {
    // the half of the stroke inside the letters is covered by them
    ctx.strokeStyle = style.outlineColor!
    ctx.lineWidth = outlineWidth * 2
    ctx.lineJoin = 'round'
    ctx.setLineDash([])
    for (let i = 0; i < text.value.length; i++) ctx.strokeText(text.value[i]!, x, getLineTop(i), text.width)
  }
  if (!letters) return

  ctx.fillStyle = style.strokeColor!
  const decorationPositions: number[] = []
  if (underline) decorationPositions.push(TEXT_UNDERLINE_POSITION)
  if (strikethrough) decorationPositions.push(TEXT_STRIKETHROUGH_POSITION)
  const thickness = text.fontSize * TEXT_DECORATION_THICKNESS
  for (let i = 0; i < text.value.length; i++) {
    const line = text.value[i]!
    const top = getLineTop(i)
    ctx.fillText(line, x, top, text.width)
    if (!decorationPositions.length) continue
    // the lines are as wide as the letters, which are narrowed to the box when they are wider
    const width = Math.min(ctx.measureText(line).width, text.width)
    if (width <= 0) continue
    const left = boxLeft + (text.width - width) * alignPosition
    for (const position of decorationPositions) ctx.fillRect(left, top + text.fontSize * position - thickness / 2, width, thickness)
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
