import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type { Point, DrawableBrush, Brush, Rect } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { updateCanvasContext } from 'utils/canvas'
import { getPointPositionAfterCanvasTransformation } from 'utils/intersect'
import { getNormalizedSize } from 'utils/transform'
import { getShapeInfos } from '.'

export const createBrush = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'brush'
    settings: ToolsSettingsType<'brush'>
  },
  cursorPosition: Point
): DrawableBrush | undefined => {
  return {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    points: [[cursorPosition]],
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default
    }
  }
}

export const drawBrush = (ctx: CanvasRenderingContext2D, brush: Brush): void => {
  if (brush.points.length < 1) return
  updateCanvasContext(ctx, brush.style)
  ctx.beginPath()

  if (brush.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return

  brush.points.forEach(points => {
    if (points.length === 1) {
      ctx.rect(points[0][0], points[0][1], 1, 1)
    } else {
      ctx.moveTo(...points[0])
      points.slice(1).forEach(point => {
        ctx.lineTo(...point)
      })
    }
  })

  ctx.stroke()
}

export const getBrushBorder = (brush: Brush, selectionPadding: number): Rect => {
  const brushPoints = _.flatMap(points => points, brush.points)
  const minX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.min,
    _.add(-selectionPadding)
  )(brushPoints)
  const maxX: number = _.flow(
    _.map((point: Point) => point[0]),
    _.max,
    _.add(selectionPadding)
  )(brushPoints)
  const minY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.min,
    _.add(-selectionPadding)
  )(brushPoints)
  const maxY: number = _.flow(
    _.map((point: Point) => point[1]),
    _.max,
    _.add(selectionPadding)
  )(brushPoints)

  return { x: minX, width: maxX - minX, y: minY, height: maxY - minY }
}

export const resizeBrush = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableBrush,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  keepRatio: boolean
): DrawableBrush => {
  const { center, borders } = getShapeInfos(originalShape, selectionPadding)

  const cursorPositionBeforeResize = getPointPositionAfterCanvasTransformation(
    cursorPosition,
    canvasOffset,
    originalShape.rotation,
    center
  )

  const scaledWidth =
    selectionMode.anchor[0] === 0.5
      ? 1
      : selectionMode.anchor[0] === 0
      ? (borders.x + borders.width - cursorPositionBeforeResize[0] + selectionPadding * -2) /
        (borders.width + selectionPadding * -2)
      : (cursorPositionBeforeResize[0] - borders.x - selectionPadding * 2) /
        (borders.width - selectionPadding * 2)

  const scaledHeight =
    selectionMode.anchor[1] === 0.5
      ? 1
      : selectionMode.anchor[1] === 0
      ? (borders.y + borders.height - cursorPositionBeforeResize[1] + selectionPadding * -2) /
        (borders.height + selectionPadding * -2)
      : (cursorPositionBeforeResize[1] - borders.y - selectionPadding * 2) /
        (borders.height - selectionPadding * 2)

  const [widthWithRatio, heightWithRatio] = keepRatio
    ? getNormalizedSize(1, 1, scaledWidth, scaledHeight)
    : [scaledWidth, scaledHeight]

  const shapeWithNewDimensions = {
    ...originalShape,
    points: originalShape.points.map(points => {
      return points.map(
        point =>
          [
            (point[0] - borders.x) * widthWithRatio + borders.x,
            (point[1] - borders.y) * heightWithRatio + borders.y
          ] as Point
      )
    })
  }

  const { center: shapeWithNewDimensionsCenter, borders: shapeWithNewDimensionsBorders } =
    getShapeInfos(shapeWithNewDimensions, selectionPadding)

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(selectionMode.anchor, center, {
    ...originalShape,
    ...borders
  })

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    { ...shapeWithNewDimensions, ...shapeWithNewDimensionsBorders },
    [widthWithRatio < 0, heightWithRatio < 0]
  )

  return {
    ...shapeWithNewDimensions,
    points: shapeWithNewDimensions.points.map(coord =>
      coord.map(([x, y]) => [x - (newOppTrueX - oppTrueX), y - (newOppTrueY - oppTrueY)])
    )
  }
}
