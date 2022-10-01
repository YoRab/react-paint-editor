import _ from 'lodash/fp'

import type { HoverModeData, SelectionModeData } from 'types/Mode'
import type { Point, ShapeEntity } from 'types/Shapes'
import { checkPositionIntersection } from './intersect'
import { getShapeInfos } from './shapes'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: ShapeEntity,
  cursorPosition: Point,
  selectionPadding: number
): SelectionModeData<Point | number> | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: 'translate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape
    }
  } else if (hoverMode.mode === 'rotate') {
    const { center: centerBeforeResize } = getShapeInfos(selectedShape, selectionPadding)
    const center: Point = [centerBeforeResize[0], centerBeforeResize[1]]
    return {
      mode: 'rotate',
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      center
    }
  } else if (hoverMode.mode === 'resize') {
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
  shapes: ShapeEntity[],
  cursorPosition: Point,
  currentScale: number,
  canvasOffset: Point,
  selectedShape: ShapeEntity | undefined,
  selectionPadding: number
): { mode: SelectionModeData<Point | number>; shape: ShapeEntity | undefined } => {
  if (selectedShape) {
    const positionIntersection = checkPositionIntersection(
      selectedShape,
      cursorPosition,
      canvasOffset,
      selectionPadding,
      currentScale,
      true
    ) || {
      mode: 'default'
    }

    const newSelectionMode = getNewSelectionData(
      positionIntersection,
      selectedShape,
      cursorPosition,
      selectionPadding
    )
    if (newSelectionMode?.mode === 'resize' || newSelectionMode?.mode === 'rotate') {
      return { shape: selectedShape, mode: newSelectionMode }
    }
  }
  const foundShape = _.find(shape => {
    return !!checkPositionIntersection(
      shape,
      cursorPosition,
      canvasOffset,
      selectionPadding,
      currentScale,
      false
    )
  }, shapes)
  if (!!foundShape) {
    return {
      shape: foundShape,
      mode: {
        mode: 'translate',
        cursorStartPosition: cursorPosition,
        originalShape: foundShape
      }
    }
  } else {
    return {
      shape: undefined,
      mode: {
        mode: 'default'
      }
    }
  }
}
