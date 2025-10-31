import type { UtilsSettings } from '@canvas/constants/app'
import { createRectangle } from '@canvas/utils/shapes/rectangle'
import { rotatePoint } from '@canvas/utils/trigo'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, Rect, SelectionType, ShapeEntity } from '@common/types/Shapes'
import { SETTINGS_DEFAULT_RECT } from '@editor/constants/tools'
import { checkPositionIntersection, checkSelectionIntersection } from './intersect'
import { getShapeInfos } from './shapes'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: SelectionType,
  cursorPosition: Point,
  settings: UtilsSettings
): SelectionModeData<Point | number> | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: 'translate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      dateStart: Date.now()
    }
  }
  if (hoverMode.mode === 'rotate') {
    const { center: centerBeforeResize } = getShapeInfos(selectedShape, settings)
    const center: Point = [centerBeforeResize[0], centerBeforeResize[1]]
    return {
      mode: 'rotate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      center
    }
  }
  if (hoverMode.mode === 'resize') {
    return {
      mode: 'resize',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      anchor: hoverMode.anchor
    }
  }
  return undefined
}

export const selectShape = (
  ctx: CanvasRenderingContext2D,
  shapes: ShapeEntity[],
  cursorPosition: Point,
  settings: UtilsSettings,
  selectedShape: SelectionType | undefined,
  isTouchGesture: boolean,
  withFrameSelection: boolean
): {
  mode: SelectionModeData<Point | number>
  shape: SelectionType | undefined
} => {
  let selectedShapePositionIntersection: false | HoverModeData = false
  if (selectedShape) {
    selectedShapePositionIntersection = checkSelectionIntersection(
      ctx,
      selectedShape,
      cursorPosition,
      settings,
      true,
      isTouchGesture ? 20 : undefined
    )

    const newSelectionMode = getNewSelectionData(selectedShapePositionIntersection || { mode: 'default' }, selectedShape, cursorPosition, settings)
    if (newSelectionMode?.mode === 'resize' || newSelectionMode?.mode === 'rotate') {
      return { shape: selectedShape, mode: newSelectionMode }
    }
  }
  const foundShape = shapes.find(shape => {
    return getSelectedShapes(selectedShape).find(selectedShape => shape.id === selectedShape?.id)
      ? !!selectedShapePositionIntersection
      : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
  })
  if (foundShape) {
    const foundShapeGroup = getSelectedShapes(selectedShape).find(shape => shape.id === foundShape?.id)
      ? selectedShape
      : buildShapesGroup([foundShape], settings)
    return {
      shape: foundShapeGroup,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        dateStart: Date.now(),
        originalShape: foundShapeGroup!
      }
    }
  }
  return {
    shape: undefined,
    mode: {
      mode: withFrameSelection ? 'selectionFrame' : 'default'
    }
  }
}

const rotateRect = (rect: Rect, rotation: number, withRotation = true): [Point, Point, Point, Point] => {
  const points: [Point, Point, Point, Point] = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height]
  ]
  if (!withRotation) return points
  const center: Point = [rect.x + rect.width / 2, rect.y + rect.height / 2]
  return points.map(point =>
    rotatePoint({
      point: [point[0], point[1]],
      origin: center,
      rotation
    })
  ) as [Point, Point, Point, Point]
}

export const buildShapesGroup = (shapes: ShapeEntity[], settings: UtilsSettings): SelectionType | undefined => {
  if (!shapes.length) return undefined
  if (shapes.length === 1) return shapes[0]

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const checkRotatedShapes = shapes.some(shape => shape.rotation !== shapes[0]!.rotation)
  const rotation = checkRotatedShapes ? 0 : shapes[0]!.rotation

  for (const shape of shapes) {
    const { borders } = getShapeInfos(shape, settings)
    const rotatedPoints = rotateRect(borders, shape.rotation, checkRotatedShapes)
    minX = Math.min(rotatedPoints[0][0], rotatedPoints[1][0], rotatedPoints[2][0], rotatedPoints[3][0], minX)
    maxX = Math.max(rotatedPoints[0][0], rotatedPoints[1][0], rotatedPoints[2][0], rotatedPoints[3][0], maxX)
    minY = Math.min(rotatedPoints[0][1], rotatedPoints[1][1], rotatedPoints[2][1], rotatedPoints[3][1], minY)
    maxY = Math.max(rotatedPoints[0][1], rotatedPoints[1][1], rotatedPoints[2][1], rotatedPoints[3][1], maxY)
  }
  const groupRectangle = createRectangle(
    {
      id: 'test',
      type: 'rect',
      settings: SETTINGS_DEFAULT_RECT
    },
    [minX, minY],
    settings,
    maxX - minX,
    maxY - minY
  )

  return {
    id: shapes.map(shape => shape.id).join('-'),
    type: 'group',
    shapes,
    rotation,
    visible: true,
    locked: false,
    selection: groupRectangle.selection,
    x: groupRectangle.x,
    y: groupRectangle.y,
    width: groupRectangle.width,
    height: groupRectangle.height
  }
}

export const applyToSelectedShape =
  (applyToShape: (shape: ShapeEntity, settings: UtilsSettings) => ShapeEntity, settings: UtilsSettings) =>
  (selection: SelectionType | undefined): SelectionType | undefined => {
    if (!selection) return undefined
    const shapes = selection.type === 'group' ? selection.shapes.map(shape => applyToShape(shape, settings)) : [applyToShape(selection, settings)]
    return buildShapesGroup(shapes, settings)
  }

export const getSelectedShapes = (selection: SelectionType | undefined): ShapeEntity[] => {
  if (!selection) return []
  return selection.type === 'group' ? selection.shapes : [selection]
}
