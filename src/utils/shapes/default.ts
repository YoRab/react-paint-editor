import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { DrawableShape } from 'types/Shapes'
import { getShapeInfos } from './index'
import { drawCircle } from './circle'
import { drawLine } from './line'
import { legacyDrawRect } from './rectangle'

export const drawSelectionDefault = ({
  ctx,
  shape,
  withAnchors,
  selectionPadding,
  selectionWidth,
  selectionColor,
  currentScale = 1
}: {
  ctx: CanvasRenderingContext2D
  shape: DrawableShape
  withAnchors: boolean
  selectionPadding: number
  selectionWidth: number
  selectionColor: string
  currentScale?: number
}) => {
  const { borders } = getShapeInfos(shape, selectionPadding / currentScale)

  legacyDrawRect(ctx, {
    ...borders,
    style: {
      fillColor: 'transparent',
      strokeColor: selectionColor,
      lineWidth: selectionWidth / currentScale
    }
  })

  if (!withAnchors || shape.locked) return

  /* drawLine(ctx, {
    points: [
      [borders.x + borders.width / 2, borders.y],
      [
        borders.x + borders.width / 2,
        borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale
      ]
    ],
    style: {
      fillColor: 'transparent',
      strokeColor: selectionColor,
      lineWidth: selectionWidth / currentScale
    }
  })

  for (const anchorPosition of SELECTION_RESIZE_ANCHOR_POSITIONS) {
    drawCircle(ctx, {
      x: borders.x + borders.width * anchorPosition[0],
      y: borders.y + borders.height * anchorPosition[1],
      radius: SELECTION_ANCHOR_SIZE / 2 / currentScale,
      style: {
        fillColor: 'rgb(255,255,255)',
        strokeColor: 'rgb(150,150,150)',
        lineWidth: selectionWidth / currentScale
      }
    })
  }
  drawCircle(ctx, {
    x: borders.x + borders.width / 2,
    y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
    radius: SELECTION_ANCHOR_SIZE / 2 / currentScale,
    style: {
      fillColor: 'rgb(255,255,255)',
      strokeColor: 'rgb(150,150,150)',
      lineWidth: selectionWidth / currentScale
    }
  })*/
}
