import _ from 'lodash/fp'

import { Marker } from '../types/Markers'
import { HoverModeData, SelectionModeData, SelectionModeLib } from '../types/Mode'
import { Point, ShapeDrawable } from '../types/Shapes'
import { checkPositionIntersection } from './intersect'
import { getShapeInfos } from './shapeData'

export const getNewSelectionData = (
  hoverMode: HoverModeData,
  selectedShape: ShapeDrawable,
  cursorPosition: Point
): SelectionModeData | undefined => {
  if (hoverMode.mode === 'translate') {
    return {
      mode: SelectionModeLib.translate,
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape
    }
  } else if (hoverMode.mode === 'rotate') {
    const { center } = getShapeInfos(selectedShape)
    return {
      mode: SelectionModeLib.rotate,
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      center
    }
  } else if (hoverMode.mode === 'resize') {
    return {
      mode: SelectionModeLib.resize,
      cursorStartPosition: cursorPosition,
      originalShape: selectedShape,
      anchor: hoverMode.anchor
    }
  }
  return undefined
}

export const selectShape = (
  activeMarker: Marker,
  shapes: ShapeDrawable[],
  cursorPosition: Point,
  selectedShape: ShapeDrawable | undefined,
  hoverMode: HoverModeData
): { mode: SelectionModeData; shape: ShapeDrawable | undefined } | false => {
  if (activeMarker.type === 'default') {
    if (selectedShape) {
      const newSelectionMode = getNewSelectionData(hoverMode, selectedShape, cursorPosition)
      if (newSelectionMode) {
        return { shape: selectedShape, mode: newSelectionMode }
      }
    }
    const foundShape = _.findLast(shape => {
      return !!checkPositionIntersection(shape, cursorPosition, false)
    }, shapes)
    if (!!foundShape) {
      return {
        shape: foundShape,
        mode: {
          mode: SelectionModeLib.translate,
          cursorStartPosition: cursorPosition,
          originalShape: foundShape
        }
      }
    } else {
      return {
        shape: undefined,
        mode: {
          mode: SelectionModeLib.default
        }
      }
    }
  }
  return false
}
