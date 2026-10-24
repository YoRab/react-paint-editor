import type { UtilsSettings } from '@canvas/constants/app'
import type { HoverModeData } from '@canvas/types/Mode'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { drawAnchor, setAnchorsStyle } from '@canvas/utils/selection/anchors'

export const drawLineSelection = ({
  ctx,
  shape,
  withAnchors,
  selectionWidth,
  selectionColor,
  hoverMode,
  settings
}: {
  ctx: CanvasRenderingContext2D
  shape: ShapeEntity<'line'> | ShapeEntity<'polygon'> | ShapeEntity<'curve'>
  withAnchors: boolean
  selectionWidth: number
  selectionColor: string
  hoverMode: HoverModeData
  settings: UtilsSettings
}) => {
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

  ctx.stroke(shape.path)

  if (!withAnchors || shape.locked) return

  setAnchorsStyle(ctx, settings)
  shape.points.forEach((point, index) => {
    drawAnchor(ctx, point, settings, hoverMode.mode === 'resize' && hoverMode.anchor === index ? selectionColor : undefined)
  })
}
