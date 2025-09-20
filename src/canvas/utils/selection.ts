import type { UtilsSettings } from '@canvas/constants/app'
import type { HoverModeData, SelectionModeData } from '@common/types/Mode'
import type { Point, ShapeEntity } from '@common/types/Shapes'
import { checkPositionIntersection, checkSelectionIntersection } from './intersect'
import { getShapeInfos } from './shapes'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: ShapeEntity,
  cursorPosition: Point,
  settings: UtilsSettings
): SelectionModeData<Point | number> | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: 'translate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape
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
  selectedShape: ShapeEntity | undefined,
  isTouchGesture: boolean,
  withFrameSelection: boolean
): {
  mode: SelectionModeData<Point | number>
  shape: ShapeEntity | undefined
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
    return shape.id === selectedShape?.id ? !!selectedShapePositionIntersection : !!checkPositionIntersection(ctx, shape, cursorPosition, settings)
  })

  if (foundShape) {
    return {
      shape: foundShape,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        originalShape: foundShape
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
