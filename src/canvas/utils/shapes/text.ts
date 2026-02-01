import type { UtilsSettings } from '@canvas/constants/app'
import { createRecSelectionPath, resizeRectSelection } from '@canvas/utils/selection/rectSelection'
import { boundVectorToSingleAxis, roundForGrid } from '@canvas/utils/transform'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, ShapeEntity, Text } from '@common/types/Shapes'
import type { ToolsSettingsType } from '@common/types/tools'
import { uniqueId } from '@common/utils/util'
import { STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT } from '@editor/constants/style'
import { getRectOppositeAnchorAbsolutePosition } from './rectangle'
import { getComputedShapeInfos } from './path'

const DEFAULT_TEXT_VALUE: string[] = ['Texte']
const DEFAULT_TEXT_WIDTH = 150

export const getComputedText = (text: DrawableShape<'text'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(text, getTextBorder, settings)
}

const buildPath = <T extends DrawableShape<'text'>>(shape: T & { id: string }, settings: UtilsSettings): ShapeEntity<'text'> => {
  const computed = getComputedText(shape, settings)
  return {
    ...shape,
    selection: createRecSelectionPath(undefined, computed, settings),
    computed
  }
}

export const refreshText = buildPath

export const calculateTextFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  maxWidth: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined = STYLE_FONT_DEFAULT
) => {
  ctx.font = `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} 1px ${fontFamily}`

  const measuredFontsSizes = text.map((value: string) => maxWidth / ctx.measureText(value).width)
  return Math.min(...measuredFontsSizes) || STYLE_FONT_SIZE_DEFAULT
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
  const fontSize = calculateTextFontSize(
    ctx,
    DEFAULT_TEXT_VALUE,
    DEFAULT_TEXT_WIDTH,
    shape.settings?.fontBold.default ?? false,
    shape.settings?.fontItalic.default ?? false,
    shape.settings.fontFamily.default
  )

  const defaultHeight = fontSize * (DEFAULT_TEXT_VALUE.length || 1)

  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: uniqueId(`${shape.type}_`),
      x: cursorPosition[0] - DEFAULT_TEXT_WIDTH,
      y: cursorPosition[1] - defaultHeight,
      value: DEFAULT_TEXT_VALUE,
      fontSize,
      width: DEFAULT_TEXT_WIDTH,
      height: defaultHeight,
      style: {
        opacity: shape.settings.opacity.default,
        strokeColor: shape.settings.strokeColor.default,
        fontFamily: shape.settings.fontFamily.default,
        fontItalic: shape.settings.fontItalic.default,
        fontBold: shape.settings.fontBold.default
      }
    },
    settings
  )
}

export const drawText = (ctx: CanvasRenderingContext2D, text: DrawableShape<'text'>): void => {
  if (ctx.globalAlpha === 0 || !text.style?.strokeColor || text.style.strokeColor === 'transparent') return

  ctx.font = `${text.style?.fontItalic ? 'italic' : ''} ${text.style?.fontBold ? 'bold' : ''} ${text.fontSize}px ${
    text.style?.fontFamily ?? STYLE_FONT_DEFAULT
  }`
  ctx.textBaseline = 'top'
  ctx.fillStyle = text.style.strokeColor
  for (let i = 0; i < text.value.length; i++) {
    ctx.fillText(text.value[i]!, text.x, text.y + i * text.fontSize, text.width)
  }
}

export const getTextBorder = (text: Text, settings: Pick<UtilsSettings, 'selectionPadding'>): Rect => {
  return {
    x: text.x - settings.selectionPadding,
    width: text.width + settings.selectionPadding * 2,
    y: text.y - settings.selectionPadding,
    height: text.height + settings.selectionPadding * 2
  }
}

export const translateText = (
  cursorPosition: Point,
  originalShape: ShapeEntity<'text'>,
  originalCursorPosition: Point,
  settings: UtilsSettings,
  singleAxis: boolean
) => {
  const translationVector = boundVectorToSingleAxis(
    [cursorPosition[0] - originalCursorPosition[0], cursorPosition[1] - originalCursorPosition[1]],
    singleAxis
  )

  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + translationVector[0], settings),
      y: roundForGrid(originalShape.y + translationVector[1], settings)
    },
    settings
  )
}

export const resizeText = (
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  originalShape: ShapeEntity<'text'>,
  selectionMode: SelectionModeResize,
  settings: UtilsSettings,
  resizeFromCenter: boolean
): ShapeEntity<'text'> => {
  const { borderX, borderHeight, borderY, borderWidth } = resizeRectSelection(
    cursorPosition,
    originalShape,
    selectionMode,
    settings,
    true,
    resizeFromCenter
  )

  const newRect = buildPath(
    {
      ...originalShape,
      width: Math.max(0, borderWidth - 2 * settings.selectionPadding),
      height: Math.max(0, borderHeight - 2 * settings.selectionPadding),
      x: borderX + settings.selectionPadding,
      y: borderY + settings.selectionPadding
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

const calculateTextWidth = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  fontSize: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined = STYLE_FONT_DEFAULT
) => {
  ctx.font = `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} ${fontSize}px ${fontFamily}`
  const measuredText = text.map((value: string) => ctx.measureText(value).width)
  return Math.max(...measuredText) || 20
}

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
  const newHeight = newShape.fontSize * newShape.value.length

  const resizedShape = {
    ...newShape,
    width: newWidth,
    height: newHeight
  }

  const { center: shapeWithNewDimensionsCenter } = getComputedText(resizedShape, settings)

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition([1, 1], shape.computed.center, shape)

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition([1, 1], shapeWithNewDimensionsCenter, resizedShape, [false, false])

  return {
    ...resizedShape,
    x: resizedShape.x - (newOppTrueX - oppTrueX),
    y: resizedShape.y - (newOppTrueY - oppTrueY)
  }
}
