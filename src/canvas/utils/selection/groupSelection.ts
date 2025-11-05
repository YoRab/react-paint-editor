import type { UtilsSettings } from '@canvas/constants/app'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { getShapeInfos } from '@canvas/utils/shapes'
import type { DrawableShape } from '@common/types/Shapes'

export const drawSelectionGroup = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'group'>,
  selectionColor: string,
  selectionWidth: number,
  settings: UtilsSettings,
  withAnchors: boolean
): void => {
  if (!shape.selection) return

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

  shape.shapes.forEach(shape => {
    ctx.restore()
    updateCanvasContext(ctx, {
      fillColor: 'transparent',
      strokeColor: selectionColor,
      lineWidth: selectionWidth / settings.canvasSize.scaleRatio
    })
    const { center } = getShapeInfos(shape, settings)
    transformCanvas(ctx, settings, shape.rotation, center)
    if (shape.selection?.shapePath) ctx.stroke(shape.selection.shapePath)
  })
}
