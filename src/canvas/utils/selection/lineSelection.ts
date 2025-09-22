import type { UtilsSettings } from '@canvas/constants/app'
import { SELECTION_ANCHOR_SIZE } from '@canvas/constants/shapes'
import { updateCanvasContext } from '@canvas/utils/canvas'
import { getShapeInfos } from '@canvas/utils/shapes'
import { createCirclePath, createRecPath } from '@canvas/utils/shapes/path'
import type { HoverModeData } from '@common/types/Mode'
import type { DrawableShape, Point, SelectionLinesType } from '@common/types/Shapes'

export const createLineSelectionPath = (
  path: Path2D | undefined,
  shape: DrawableShape<'line' | 'polygon' | 'curve'> & {
    points: readonly Point[]
  },
  settings: UtilsSettings
): SelectionLinesType => {
  const { borders } = getShapeInfos(shape, settings)

  return {
    border: createRecPath(borders),
    shapePath: path,
    anchors: [
      ...shape.points.map(point =>
        createCirclePath({
          x: point[0],
          y: point[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / settings.canvasSize.scaleRatio
        })
      )
    ]
  }
}

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
  shape: DrawableShape<'line'> | DrawableShape<'polygon'> | DrawableShape<'curve'>
  withAnchors: boolean
  selectionWidth: number
  selectionColor: string
  hoverMode: HoverModeData
  settings: UtilsSettings
}) => {
  if (!shape.selection) return

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / settings.canvasSize.scaleRatio
  })

  if (shape.selection.shapePath) ctx.stroke(shape.selection.shapePath)

  if (!withAnchors || shape.locked) return

  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)',
    lineWidth: 2 / settings.canvasSize.scaleRatio,
    shadowColor: selectionColor,
    shadowBlur: 0
  })

  for (let i = 0; i < shape.selection.anchors.length; i++) {
    const anchor = shape.selection.anchors[i]
    if (hoverMode.mode === 'resize' && hoverMode.anchor === i) {
      ctx.shadowBlur = 10
      ctx.fill(anchor)
      ctx.shadowBlur = 0
    } else {
      ctx.fill(anchor)
    }
    ctx.stroke(anchor)
  }
}
