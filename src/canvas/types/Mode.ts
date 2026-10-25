import type { SelectionHover } from './editor'
import type { Point, SelectionType } from './Shapes'

export type SelectionModeDefault = {
  mode: 'default'
}

export type SelectionModeSelectionFrame = {
  mode: 'selectionFrame'
}

export type SelectionModeBrush = {
  mode: 'brush'
}

export type SelectionModePreview = {
  mode: 'preview'
}

export type SelectionModeEditText = {
  mode: 'textedition'
  defaultValue: string[]
}

export type SelectionModeResize<AnchorType extends Point | number = Point> = {
  mode: 'resize'
  cursorStartPosition: Point
  originalShape: SelectionType
  selectedShapesLengthAtMouseDown: number
  anchor: AnchorType
}

export type SelectionModeRotate = {
  mode: 'rotate'
  cursorStartPosition: Point
  originalShape: SelectionType
  selectedShapesLengthAtMouseDown: number
  center: Point
}
export type SelectionModeTranslate = {
  mode: 'translate'
  cursorStartPosition: Point
  originalShape: SelectionType
  selectedShapesLengthAtMouseDown: number
  hasBeenDuplicated: boolean
  dateStart: number
}

export type SelectionModeContextMenu<AnchorType extends Point | number = Point> = {
  mode: 'contextMenu'
  cursorStartPosition: Point
  clientPosition: { x: number; y: number }
  originalShape: SelectionType | undefined
  anchor: AnchorType | undefined
}

/** A stroke of the eraser: the shapes it has crossed are removed when it is released */
export type SelectionModeEraser = {
  mode: 'eraser'
  erasedShapeIds: string[]
}

/** A stroke of the laser pointer, drawn over the shapes */
export type SelectionModeLaser = {
  mode: 'laser'
}

export type SelectionModeData<AnchorType extends Point | number> =
  | SelectionModeDefault
  | SelectionModeSelectionFrame
  | SelectionModeBrush
  | SelectionModeResize<AnchorType>
  | SelectionModeRotate
  | SelectionModeTranslate
  | SelectionModeEditText
  | SelectionModePreview
  | SelectionModeContextMenu<AnchorType>
  | SelectionModeEraser
  | SelectionModeLaser

/** The part of the selection under the pointer, or 'default' away from it */
export type HoverModeData = { outOfView?: boolean } & ({ mode: 'default' } | SelectionHover)
