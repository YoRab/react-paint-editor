import { Point, DrawableShape } from './Shapes'

export enum SelectionModeLib {
  'default' = 'default',
  'brush' = 'brush',
  'resize' = 'resize',
  'rotate' = 'rotate',
  'translate' = 'translate',
  'textedition' = 'textedition'
}

export type SelectionModeDefault = {
  mode: SelectionModeLib.default
}

export type SelectionModeBrush = {
  mode: SelectionModeLib.brush
}

export type SelectionModeEditText = {
  mode: SelectionModeLib.textedition
  defaultValue: string[]
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
  | SelectionModeBrush
  | SelectionModeResize<AnchorType>
  | SelectionModeRotate
  | SelectionModeTranslate
  | SelectionModeEditText

export type HoverModeData =
  | {
      mode: SelectionModeLib.default
    }
  | {
      mode: SelectionModeLib.resize
      anchor: Point | number
    }
  | {
      mode: SelectionModeLib.brush
    }
  | {
      mode: SelectionModeLib.rotate
    }
  | {
      mode: SelectionModeLib.translate
    }
  | {
      mode: SelectionModeLib.textedition
    }
