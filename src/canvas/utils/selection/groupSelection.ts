import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { drawRectAnchors, strokeBorders } from '@canvas/utils/selection/anchors'
import { getSelectionOutline } from '@canvas/utils/selection/rectSelection'

export const drawSelectionGroup = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity<'group'>,
  selectionColor: string,
  selectionWidth: number,
  selectionMode: SelectionModeData<number | Point>,
  settings: UtilsSettings,
  withAnchors: boolean
): void => {
  shape.shapes.forEach(shape => {
    updateCanvasContext(ctx, {
      fillColor: 'transparent',
      strokeColor: selectionColor,
      lineWidth: selectionWidth / settings.canvasSize.scaleRatio
    })

    transformCanvas(ctx, settings, shape.rotation, shape.computed.center)
    const outline = getSelectionOutline(shape)
    if (outline) ctx.stroke(outline)
    ctx.restore()
  })

  if (selectionMode.mode === 'rotate') return

  transformCanvas(ctx, settings, shape.rotation, shape.computed.center)

  if (settings.debug) {
    updateCanvasContext(ctx, {
      fillColor: 'transparent',
      strokeColor: 'red',
      lineWidth: selectionWidth / settings.canvasSize.scaleRatio
    })

    ctx.strokeRect(
      shape.computed.outerBorders.x,
      shape.computed.outerBorders.y,
      shape.computed.outerBorders.width,
      shape.computed.outerBorders.height
    )
  }

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / settings.canvasSize.scaleRatio
  })

  if (withAnchors && !shape.locked) {
    strokeBorders(ctx, shape.computed.borders)
    drawRectAnchors(ctx, shape.computed.borders, settings)
  }
}
