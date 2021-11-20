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

export type SelectionModeResize<AnchorType extends Point | number = Point> = {
  mode: SelectionModeLib.resize
  cursorStartPosition: Point
  originalShape: DrawableShape
  anchor: AnchorType
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

export type SelectionModeData<AnchorType extends Point | number> =
  | SelectionModeDefault
  | SelectionModeResize<AnchorType>
  | SelectionModeRotate
  | SelectionModeTranslate

export type HoverModeData =
  | {
      mode: SelectionModeLib.default
    }
  | {
      mode: SelectionModeLib.resize
      anchor: Point | number
    }
  | {
      mode: SelectionModeLib.rotate
    }
  | {
      mode: SelectionModeLib.translate
    }
