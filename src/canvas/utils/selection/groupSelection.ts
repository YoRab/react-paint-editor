import type { UtilsSettings } from '@canvas/constants/app'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'

export const drawSelectionGroup = (
  ctx: CanvasRenderingContext2D,
  shape: ShapeEntity<'group'>,
  selectionColor: string,
  selectionWidth: number,
  selectionMode: SelectionModeData<number | Point>,
  settings: UtilsSettings,
  withAnchors: boolean
): void => {
  if (!shape.selection) return

  shape.shapes.forEach(shape => {
    updateCanvasContext(ctx, {
      fillColor: 'transparent',
      strokeColor: selectionColor,
      lineWidth: selectionWidth / settings.canvasSize.scaleRatio
    })

    transformCanvas(ctx, settings, shape.rotation, shape.computed.center)
    if (shape.selection?.shapePath) ctx.stroke(shape.selection.shapePath)
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
    ctx.stroke(shape.selection.border)
    if (shape.selection.line) ctx.stroke(shape.selection.line)

    updateCanvasContext(ctx, {
      fillColor: 'rgb(255,255,255)',
      strokeColor: 'rgb(150,150,150)',
      lineWidth: 2 / settings.canvasSize.scaleRatio
    })

    for (const anchor of shape.selection.anchors) {
      ctx.fill(anchor)
      ctx.stroke(anchor)
    }
  }
}
