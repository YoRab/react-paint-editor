import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '@canvas/constants/shapes'
import type { Point, Rect, SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import { updateCanvasContext } from '@canvas/utils/canvas'

// The anchors keep the same size on the screen whatever the zoom: they are not part of the shapes, and are placed at the
// scale of the view, to be drawn as to be hovered

/** Whether the anchors of a shape are its points, a line, a polygon or a curve, instead of its borders */
export const hasPointAnchors = (shape: SelectionType): shape is ShapeEntity<'line' | 'polygon' | 'curve'> =>
  shape.type === 'line' || shape.type === 'polygon' || shape.type === 'curve'

export const getAnchorRadius = (settings: UtilsSettings) => SELECTION_ANCHOR_SIZE / 2 / settings.canvasSize.scaleRatio

/** Center of the anchor of the rotation, above the borders of a selection */
export const getRotationAnchorCenter = (borders: Rect, settings: UtilsSettings): Point => [
  borders.x + borders.width / 2,
  borders.y - (SELECTION_ANCHOR_SIZE / 2 + SELECTION_ROTATED_ANCHOR_POSITION) / settings.canvasSize.scaleRatio
]

/** Center of an anchor of the resize, at its position on the borders of a selection */
export const getResizeAnchorCenter = (borders: Rect, [ratioX, ratioY]: Point): Point => [
  borders.x + borders.width * ratioX,
  borders.y + borders.height * ratioY
]

/** Strokes the borders of a selection */
export const strokeBorders = (ctx: CanvasRenderingContext2D, { x, y, width, height }: Rect) => {
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.stroke()
}

export const setAnchorsStyle = (ctx: CanvasRenderingContext2D, settings: UtilsSettings) =>
  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)',
    lineWidth: 2 / settings.canvasSize.scaleRatio
  })

/** Draws an anchor with the style of the anchors, with a halo of the given color when it is hovered */
export const drawAnchor = (ctx: CanvasRenderingContext2D, [x, y]: Point, settings: UtilsSettings, haloColor?: string) => {
  ctx.beginPath()
  ctx.arc(x, y, getAnchorRadius(settings), 0, 2 * Math.PI)
  if (haloColor) {
    ctx.shadowColor = haloColor
    ctx.shadowBlur = 10
  }
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.stroke()
}

/** Draws the stem and the anchor of the rotation, then the anchors of the resize, around the borders of a selection */
export const drawRectAnchors = (ctx: CanvasRenderingContext2D, borders: Rect, settings: UtilsSettings) => {
  const rotationCenter = getRotationAnchorCenter(borders, settings)
  ctx.beginPath()
  ctx.moveTo(rotationCenter[0], borders.y)
  ctx.lineTo(rotationCenter[0], rotationCenter[1])
  ctx.stroke()

  setAnchorsStyle(ctx, settings)
  drawAnchor(ctx, rotationCenter, settings)
  for (const position of SELECTION_RESIZE_ANCHOR_POSITIONS) {
    drawAnchor(ctx, getResizeAnchorCenter(borders, position), settings)
  }
}
