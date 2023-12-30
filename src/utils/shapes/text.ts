import type {
  Point,
  DrawableShape,
  Text,
  Rect,
  ShapeEntity,
} from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT } from '../../constants/style'
import { SelectionModeResize } from '../../types/Mode'
import { getRectOppositeAnchorAbsolutePosition, resizeRect } from './rectangle'
import { getShapeInfos } from '../../utils/shapes/index'
import { GridFormatType } from '../../constants/app'
import { roundForGrid } from '../../utils/transform'
import { createRecSelectionPath } from '../../utils/selection/rectSelection'
import { uniqueId } from '../../utils/util'

const DEFAULT_TEXT_VALUE: string[] = ['Texte']

const buildPath = <T extends DrawableShape<'text'>>(
  shape: T,
  currentScale: number,
  selectionPadding: number
): T => {
  return {
    ...shape,
    selection: createRecSelectionPath(shape, currentScale, selectionPadding)
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
  currentScale: number,
  selectionPadding: number
): ShapeEntity<'text'> => {
  const fontSize = calculateTextFontSize(
    ctx,
    DEFAULT_TEXT_VALUE,
    50,
    shape.settings?.fontBold.default ?? false,
    shape.settings?.fontItalic.default ?? false,
    shape.settings.fontFamily.default
  )
  return buildPath(
    {
      toolId: shape.id,
      type: shape.type,
      id: uniqueId(`${shape.type}_`),
      x: cursorPosition[0],
      y: cursorPosition[1],
      value: DEFAULT_TEXT_VALUE,
      fontSize,
      width: 50,
      height: fontSize * (DEFAULT_TEXT_VALUE.length || 1),
      rotation: 0,
      style: {
        globalAlpha: shape.settings.opacity.default,
        strokeColor: shape.settings.strokeColor.default,
        fontFamily: shape.settings.fontFamily.default
      }
    },
    currentScale,
    selectionPadding
  )
}

export const drawText = (ctx: CanvasRenderingContext2D, text: DrawableShape<'text'>): void => {
  if (ctx.globalAlpha === 0 || !text.style?.strokeColor || text.style.strokeColor === 'transparent')
    return

  ctx.font = `${text.style?.fontItalic ? 'italic' : ''} ${text.style?.fontBold ? 'bold' : ''} ${text.fontSize
    }px ${text.style?.fontFamily ?? STYLE_FONT_DEFAULT}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = text.style.strokeColor
  for (let i = 0; i < text.value.length; i++) {
    ctx.fillText(text.value[i], text.x, text.y + i * text.fontSize, text.width)
  }
}

export const getTextBorder = (text: Text, selectionPadding: number): Rect => {
  return {
    x: text.x - selectionPadding,
    width: text.width + selectionPadding * 2,
    y: text.y - selectionPadding,
    height: text.height + selectionPadding * 2
  }
}

export const translateText = <U extends DrawableShape<'text'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number,
  selectionPadding: number
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    },
    currentScale,
    selectionPadding
  )
}

export const resizeText = (
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  originalShape: DrawableShape<'text'>,
  selectionMode: SelectionModeResize,
  gridFormat: GridFormatType,
  selectionPadding: number,
  currentScale: number
): DrawableShape<'text'> => {
  const newRect = resizeRect(
    cursorPosition,
    originalShape,
    selectionMode,
    gridFormat,
    selectionPadding,
    currentScale,
    true
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
  } as DrawableShape<'text'>
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

export const resizeTextShapeWithNewContent = <U extends DrawableShape<'text'>>(
  ctx: CanvasRenderingContext2D,
  shape: U,
  newValue: string[],
  selectionPadding: number,
  canvasOffset: Point
): U => {
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

  const { center } = getShapeInfos(shape, selectionPadding)

  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(resizedShape, selectionPadding)

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(
    [1, 1],
    center,
    shape,
    canvasOffset
  )

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    [1, 1],
    shapeWithNewDimensionsCenter,
    resizedShape,
    canvasOffset,
    [false, false]
  )

  return {
    ...resizedShape,
    x: resizedShape.x - (newOppTrueX - oppTrueX),
    y: resizedShape.y - (newOppTrueY - oppTrueY)
  }
}
