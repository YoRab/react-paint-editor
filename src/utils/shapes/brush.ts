import { GridFormatType } from 'constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type { Point, DrawableBrush, Brush, Rect } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { getPointPositionAfterCanvasTransformation } from 'utils/intersect'
import { getNormalizedSize, roundForGrid } from 'utils/transform'
import { getShapeInfos } from '.'
import { getRectOppositeAnchorAbsolutePosition } from './rectangle'

export const addPath = (brush: DrawableBrush) => {
  if (brush.points.length < 1 || brush.style?.strokeColor === 'transparent') return brush

  const path = new Path2D()

  brush.points.forEach(points => {
    if (points.length === 1) {
      path.rect(points[0][0], points[0][1], 1, 1)
    } else {
      path.moveTo(...points[0])
      points.slice(1).forEach(point => {
        path.lineTo(...point)
      })
    }
  })

  return {
    ...brush,
    path
  }
}

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
  const brushShape = {
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
  return addPath(brushShape)
}

export const drawBrush = (ctx: CanvasRenderingContext2D, shape: DrawableBrush): void => {
  if (shape.points.length < 1 || !shape.path) return
  if (shape.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return
  ctx.stroke(shape.path)
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

export const translateBrush = (
  cursorPosition: Point,
  originalShape: DrawableBrush,
  originalCursorPosition: Point,
  gridFormat: GridFormatType
): DrawableBrush => {
  const { borders } = getShapeInfos(originalShape, 0)
  const translationX = gridFormat
    ? roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], gridFormat) -
      borders.x
    : cursorPosition[0] - originalCursorPosition[0]
  const translationY = gridFormat
    ? roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], gridFormat) -
      borders.y
    : cursorPosition[1] - originalCursorPosition[1]
  return addPath({
    ...originalShape,
    points: originalShape.points.map(coord =>
      coord.map(([x, y]) => [x + translationX, y + translationY])
    ) as Point[][]
  })
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
    originalShape.rotation,
    center,
    canvasOffset
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

  const [oppTrueX, oppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    center,
    {
      ...originalShape,
      ...borders
    },
    canvasOffset
  )

  const [newOppTrueX, newOppTrueY] = getRectOppositeAnchorAbsolutePosition(
    selectionMode.anchor,
    shapeWithNewDimensionsCenter,
    { ...shapeWithNewDimensions, ...shapeWithNewDimensionsBorders },
    canvasOffset,
    [widthWithRatio < 0, heightWithRatio < 0]
  )

  const brushShape: DrawableBrush = {
    ...shapeWithNewDimensions,
    points: shapeWithNewDimensions.points.map(coord =>
      coord.map(([x, y]) => [x - (newOppTrueX - oppTrueX), y - (newOppTrueY - oppTrueY)])
    )
  }

  return addPath(brushShape)
}

export const addNewPointToShape = (shape: DrawableBrush, cursorPosition: Point) => {
  const brushShape = {
    ...shape,
    ...{
      points: _.set(
        shape.points.length - 1,
        [
          ...shape.points[shape.points.length - 1],
          [Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]
        ],
        shape.points
      )
    }
  }
  return addPath(brushShape)
}

export const addNewPointGroupToShape = (shape: DrawableBrush, cursorPosition: Point) => {
  const brushShape = {
    ...shape,
    ...{
      points: _.set(
        shape.points.length,
        [[Math.round(cursorPosition[0]), Math.round(cursorPosition[1])]],
        shape.points
      )
    }
  }
  return addPath(brushShape)
}
