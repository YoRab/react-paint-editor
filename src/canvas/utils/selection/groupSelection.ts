import type { UtilsSettings } from '@canvas/constants/app'
import type { SelectionModeData } from '@canvas/types/Mode'
import type { MultiSelection, Point, ShapeEntity } from '@canvas/types/Shapes'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { drawRectAnchors, strokeBorders } from '@canvas/utils/selection/anchors'
import { getSelectionOutline } from '@canvas/utils/selection/rectSelection'

/**
 * Selection of shapes framed together, the shapes selected or the shapes of a group: the outline of each of them, a group
 * being outlined by its frame, then their frame
 */
export const drawSelectionGroup = (
  ctx: CanvasRenderingContext2D,
  shape: MultiSelection | ShapeEntity<'group'>,
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

  const hasAnchors = withAnchors && !shape.locked
  // a group is shown by its frame, also when it is hovered or locked
  if (hasAnchors || shape.type === 'group') strokeBorders(ctx, shape.computed.borders)
  if (hasAnchors) drawRectAnchors(ctx, shape.computed.borders, settings)
}
