import _ from 'lodash/fp'
import type {
  Point,
  DrawableShape,
  Text,
  Rect,
  ShapeEntity,
  SelectionDefaultType
} from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { STYLE_FONT_DEFAULT, STYLE_FONT_SIZE_DEFAULT } from 'constants/style'
import { SelectionModeResize } from 'types/Mode'
import { createRecPath, getRectOppositeAnchorAbsolutePosition, resizeRect } from './rectangle'
import { getShapeInfos } from 'utils/shapes/index'
import { GridFormatType } from 'constants/app'
import { roundForGrid } from 'utils/transform'
import { updateCanvasContext } from 'utils/canvas'
import { createLinePath } from './line'
import { createCirclePath } from './circle'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'

const createTextSelectionPath = (
  rect: DrawableShape<'text'>,
  currentScale: number
): SelectionDefaultType => {
  const { borders } = getShapeInfos(rect, 0)

  return {
    border: createRecPath(borders),
    line: createLinePath({
      points: [
        [borders.x + borders.width / 2, borders.y],
        [
          borders.x + borders.width / 2,
          borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale
        ]
      ]
    }),
    anchors: [
      createCirclePath({
        x: borders.x + borders.width / 2,
        y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
        radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
      }),
      ...SELECTION_RESIZE_ANCHOR_POSITIONS.map(anchorPosition =>
        createCirclePath({
          x: borders.x + borders.width * anchorPosition[0],
          y: borders.y + borders.height * anchorPosition[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
        })
      )
    ]
  }
}

const buildPath = <T extends DrawableShape<'text'>>(shape: T, currentScale: number): T => {
  return {
    ...shape,
    selection: createTextSelectionPath(shape, currentScale)
  }
}

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
    type: 'text'
    settings: ToolsSettingsType<'text'>
  },
  cursorPosition: Point,
  currentScale: number
): ShapeEntity<'text'> => {
  const defaultValue: string[] = ['Texte']
  const fontSize = calculateTextFontSize(
    ctx,
    defaultValue,
    50,
    shape.settings?.fontBold.default ?? false,
    shape.settings?.fontItalic.default ?? false,
    shape.settings.fontFamily.default
  )
  return buildPath(
    {
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
    },
    currentScale
  )
}

export const drawText = (ctx: CanvasRenderingContext2D, text: DrawableShape<'text'>): void => {
  if (ctx.globalAlpha === 0 || !text.style?.strokeColor || text.style.strokeColor === 'transparent')
    return

  ctx.font = `${text.style?.fontItalic ? 'italic' : ''} ${text.style?.fontBold ? 'bold' : ''} ${
    text.fontSize
  }px ${text.style?.fontFamily ?? STYLE_FONT_DEFAULT}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = text.style.strokeColor
  for (let i = 0; i < text.value.length; i++) {
    ctx.fillText(text.value[i], text.x, text.y + i * text.fontSize, text.width)
  }
}

export const drawSelectionText = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'text'>,
  selectionColor: string,
  selectionWidth: number,
  currentScale: number,
  withAnchors: boolean
): void => {
  if (!shape.selection) return

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / currentScale
  })

  ctx.stroke(shape.selection.border)

  if (!withAnchors || shape.locked) return

  ctx.stroke(shape.selection.line)

  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)'
  })

  for (const anchor of shape.selection.anchors) {
    ctx.fill(anchor)
    ctx.stroke(anchor)
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
  currentScale: number
) => {
  return buildPath(
    {
      ...originalShape,
      x: roundForGrid(originalShape.x + cursorPosition[0] - originalCursorPosition[0], gridFormat),
      y: roundForGrid(originalShape.y + cursorPosition[1] - originalCursorPosition[1], gridFormat)
    },
    currentScale
  )
}

export const resizeText = (
  ctx: CanvasRenderingContext2D,
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<'text'>,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  currentScale: number
): DrawableShape<'text'> => {
  const newRect = resizeRect(
    cursorPosition,
    canvasOffset,
    originalShape,
    selectionMode,
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
  return (
    _.flow(
      _.map((value: string) => ctx.measureText(value).width),
      _.max
    )(text) ?? 20
  )
}

export const resizeTextShapeWithNewContent = <U extends DrawableShape<'text'>>(
  ctx: CanvasRenderingContext2D,
  shape: U,
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
