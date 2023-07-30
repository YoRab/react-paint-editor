import _ from 'lodash/fp'
import type { Point, DrawableText, Text, Rect, DrawableShape } from '../../types/Shapes'
import type { ToolsSettingsType } from '../../types/tools'
import { updateCanvasContext } from '../../utils/canvas'
import { STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT } from '../../constants/style'
import { SelectionModeResize } from '../../types/Mode'
import { getRectOppositeAnchorAbsolutePosition, resizeRect } from './rectangle'
import { getShapeInfos } from '.'

export const calculateTextFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string[],
  maxWidth: number,
  fontBold: boolean,
  fontItalic: boolean,
  fontFamily: string | undefined = STYLE_FONT_DEFAULT
) => {
  ctx.font = `${fontItalic ? 'italic' : ''} ${fontBold ? 'bold' : ''} 1px ${fontFamily}`
  return (
    _.flow(
      _.map((value: string) => maxWidth / ctx.measureText(value).width),
      _.min
    )(text) ?? STYLE_FONT_SIZE_DEFAULT
  )
}

export const createText = (
  ctx: CanvasRenderingContext2D,
  shape: {
    id: string
    icon: string
    label: string
    type: 'text'
    settings: ToolsSettingsType<'text'>
  },
  cursorPosition: Point
): DrawableText | undefined => {
  const defaultValue: string[] = ['Texte']
  const fontSize = calculateTextFontSize(
    ctx,
    defaultValue,
    50,
    shape.settings?.fontBold.default ?? false,
    shape.settings?.fontItalic.default ?? false,
    shape.settings.fontFamily.default
  )
  return {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    x: cursorPosition[0],
    y: cursorPosition[1],
    value: defaultValue,
    fontSize,
    width: 50,
    height: fontSize * (defaultValue.length || 1),
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      strokeColor: shape.settings.strokeColor.default,
      fontFamily: shape.settings.fontFamily.default
    }
  }
}

export const drawText = (ctx: CanvasRenderingContext2D, text: Text): void => {
  updateCanvasContext(ctx, text.style)

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

export const resizeText = <T extends DrawableShape & Text>(
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: T,
  selectionMode: SelectionModeResize,
  selectionPadding: number
): T => {
  const newRect = resizeRect(
    cursorPosition,
    canvasOffset,
    originalShape,
    selectionMode,
    selectionPadding,
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
  }
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
  return (
    _.flow(
      _.map((value: string) => ctx.measureText(value).width),
      _.max
    )(text) ?? 20
  )
}

export const resizeTextShapeWithNewContent = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableText,
  newValue: string[],
  canvasOffset: Point
) => {
  const newShape = _.set('value', newValue, shape)
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

  const selectionPadding = 0
  const { center } = getShapeInfos(shape, selectionPadding)

  const { center: shapeWithNewDimensionsCenter } = getShapeInfos(resizedShape, selectionPadding)

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(
    [1, 0.5],
    center,
    shape,
    canvasOffset
  )

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    [1, 0.5],
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
