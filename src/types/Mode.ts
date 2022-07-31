import type { Point, DrawableShape } from './Shapes'

export type SelectionModeDefault = {
  mode: 'default'
}

export type SelectionModeBrush = {
  mode: 'brush'
}

export type SelectionModeEditText = {
  mode: 'textedition'
  defaultValue: string[]
}

export type SelectionModeResize<AnchorType extends Point | number = Point> = {
  mode: 'resize'
  cursorStartPosition: Point
  originalShape: DrawableShape
  anchor: AnchorType
}

export type SelectionModeRotate = {
  mode: 'rotate'
  cursorStartPosition: Point
  originalShape: DrawableShape
  center: Point
}
export type SelectionModeTranslate = {
  mode: 'translate'
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
      mode: 'default'
    }
  | {
      mode: 'resize'
      anchor: Point | number
    }
  | {
      mode: 'brush'
    }
  | {
      mode: 'rotate'
    }
  | {
      mode: 'translate'
    }
  | {
      mode: 'textedition'
    }
