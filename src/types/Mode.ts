import { Point, DrawableShape } from './Shapes'

export enum SelectionModeLib {
  'default' = 'default',
  'resize' = 'resize',
  'rotate' = 'rotate',
  'translate' = 'translate'
}

export type SelectionModeDefault = {
  mode: SelectionModeLib.default
}

export type SelectionModeResize = {
  mode: SelectionModeLib.resize
  cursorStartPosition: Point
  originalShape: DrawableShape
  anchor: [number, number]
}

export type SelectionModeRotate = {
  mode: SelectionModeLib.rotate
  cursorStartPosition: Point
  originalShape: DrawableShape
  center: Point
}
export type SelectionModeTranslate = {
  mode: SelectionModeLib.translate
  cursorStartPosition: Point
  originalShape: DrawableShape
}

export type SelectionModeData =
  | SelectionModeDefault
  | SelectionModeResize
  | SelectionModeRotate
  | SelectionModeTranslate

export type HoverModeData =
  | {
      mode: SelectionModeLib.default
    }
  | {
      mode: SelectionModeLib.resize
      anchor: [number, number]
    }
  | {
      mode: SelectionModeLib.rotate
    }
  | {
      mode: SelectionModeLib.translate
    }
