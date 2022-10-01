import { GridFormatType } from 'constants/app'
import _ from 'lodash/fp'
import { SelectionModeResize } from 'types/Mode'
import type {
  Point,
  Brush,
  Rect,
  DrawableShape,
  ShapeEntity,
  SelectionDefaultType
} from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'
import { getPointPositionAfterCanvasTransformation } from 'utils/intersect'
import { getNormalizedSize, roundForGrid } from 'utils/transform'
import { getShapeInfos } from 'utils/shapes/index'
import { createRecPath, getRectOppositeAnchorAbsolutePosition } from './rectangle'
import { updateCanvasContext } from 'utils/canvas'
import { createLinePath } from './line'
import {
  SELECTION_ANCHOR_SIZE,
  SELECTION_RESIZE_ANCHOR_POSITIONS,
  SELECTION_ROTATED_ANCHOR_POSITION
} from 'constants/shapes'
import { createCirclePath } from './circle'

const createBrushPath = (brush: DrawableShape<'brush'>) => {
  if (brush.points.length < 1 || brush.style?.strokeColor === 'transparent') return undefined

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

  return path
}

const createBrushSelectionPath = (
  rect: DrawableShape<'brush'>,
  currentScale: number
): SelectionDefaultType => {
  const { borders } = getShapeInfos(rect, 0)

  return {
    border: createRecPath(borders),
    line: createLinePath({
      points: [
        [borders.x + borders.width / 2, borders.y],
        [
          borders.x + borders.width / 2,
          borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale
        ]
      ]
    }),
    anchors: [
      createCirclePath({
        x: borders.x + borders.width / 2,
        y: borders.y - SELECTION_ANCHOR_SIZE / 2 - SELECTION_ROTATED_ANCHOR_POSITION / currentScale,
        radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
      }),
      ...SELECTION_RESIZE_ANCHOR_POSITIONS.map(anchorPosition =>
        createCirclePath({
          x: borders.x + borders.width * anchorPosition[0],
          y: borders.y + borders.height * anchorPosition[1],
          radius: SELECTION_ANCHOR_SIZE / 2 / currentScale
        })
      )
    ]
  }
}

const buildPath = <T extends DrawableShape<'brush'>>(brush: T, currentScale: number): T => {
  return {
    ...brush,
    path: createBrushPath(brush),
    selection: createBrushSelectionPath(brush, currentScale)
  }
}

export const createBrush = (
  shape: {
    id: string
    type: 'brush'
    settings: ToolsSettingsType<'brush'>
  },
  cursorPosition: Point,
  currentScale: number
): ShapeEntity<'brush'> => {
  return buildPath(
    {
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
    },
    currentScale
  )
}

export const drawBrush = (ctx: CanvasRenderingContext2D, shape: DrawableShape<'brush'>): void => {
  if (shape.points.length < 1 || !shape.path) return
  if (ctx.globalAlpha === 0) return
  if (shape.style?.strokeColor === 'transparent' || ctx.globalAlpha === 0) return
  ctx.stroke(shape.path)
}

export const drawSelectionBrush = (
  ctx: CanvasRenderingContext2D,
  shape: DrawableShape<'brush'>,
  selectionColor: string,
  selectionWidth: number,
  currentScale: number,
  withAnchors: boolean
): void => {
  if (!shape.selection) return

  updateCanvasContext(ctx, {
    fillColor: 'transparent',
    strokeColor: selectionColor,
    lineWidth: selectionWidth / currentScale
  })

  ctx.stroke(shape.selection.border)

  if (!withAnchors || shape.locked) return

  ctx.stroke(shape.selection.line)

  updateCanvasContext(ctx, {
    fillColor: 'rgb(255,255,255)',
    strokeColor: 'rgb(150,150,150)'
  })

  for (const anchor of shape.selection.anchors) {
    ctx.fill(anchor)
    ctx.stroke(anchor)
  }
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

export const translateBrush = <U extends DrawableShape<'brush'>>(
  cursorPosition: Point,
  originalShape: U,
  originalCursorPosition: Point,
  gridFormat: GridFormatType,
  currentScale: number
) => {
  const { borders } = getShapeInfos(originalShape, 0)
  const translationX = gridFormat
    ? roundForGrid(borders.x + cursorPosition[0] - originalCursorPosition[0], gridFormat) -
      borders.x
    : cursorPosition[0] - originalCursorPosition[0]
  const translationY = gridFormat
    ? roundForGrid(borders.y + cursorPosition[1] - originalCursorPosition[1], gridFormat) -
      borders.y
    : cursorPosition[1] - originalCursorPosition[1]
  return buildPath(
    {
      ...originalShape,
      points: originalShape.points.map(coord =>
        coord.map(([x, y]) => [x + translationX, y + translationY])
      ) as Point[][]
    },
    currentScale
  )
}

export const resizeBrush = (
  cursorPosition: Point,
  canvasOffset: Point,
  originalShape: DrawableShape<'brush'>,
  selectionMode: SelectionModeResize,
  selectionPadding: number,
  currentScale: number,
  keepRatio: boolean
): DrawableShape<'brush'> => {
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

  const brushShape: DrawableShape<'brush'> = {
    ...shapeWithNewDimensions,
    points: shapeWithNewDimensions.points.map(coord =>
      coord.map(([x, y]) => [x - (newOppTrueX - oppTrueX), y - (newOppTrueY - oppTrueY)])
    )
  }

  return buildPath(brushShape, currentScale)
}

export const addNewPointToShape = <T extends DrawableShape<'brush'>>(
  shape: T,
  cursorPosition: Point,
  currentScale: number
) => {
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
  return buildPath(brushShape, currentScale)
}

export const addNewPointGroupToShape = <T extends DrawableShape<'brush'>>(
  shape: T,
  cursorPosition: Point,
  currentScale: number
): T => {
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
  return buildPath(brushShape, currentScale)
}
