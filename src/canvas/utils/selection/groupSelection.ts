import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE, SELECTION_RESIZE_ANCHOR_POSITIONS, SELECTION_ROTATED_ANCHOR_POSITION } from '@canvas/constants/shapes'
import { updateCanvasContext } from '@canvas/utils/canvas'
import { getShapeInfos } from '@canvas/utils/shapes/index'
import { createCirclePath, createLinePath, createRecPath } from '@canvas/utils/shapes/path'
import { roundForGrid, roundValues } from '@canvas/utils/transform'
import { rotatePoint } from '@canvas/utils/trigo'
import type { SelectionModeResize } from '@common/types/Mode'
import type { DrawableShape, Point, Rect, SelectionDefaultType } from '@common/types/Shapes'

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

  shape.shapes.forEach(shape => {
    if (shape.selection?.shapePath) ctx.stroke(shape.selection.shapePath)
  })

  if (!withAnchors || shape.locked) return

  ctx.stroke(shape.selection.border)
  ctx.stroke(shape.selection.line)

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
