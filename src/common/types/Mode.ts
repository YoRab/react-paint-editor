import type { Point, ShapeEntity } from './Shapes'

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
  isCreating: boolean
  cursorStartPosition: Point
  originalShape: ShapeEntity
  anchor: AnchorType
}

export type SelectionModeRotate = {
  mode: 'rotate'
  cursorStartPosition: Point
  originalShape: ShapeEntity
  center: Point
}
export type SelectionModeTranslate = {
  mode: 'translate'
  cursorStartPosition: Point
  originalShape: ShapeEntity
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

export type HoverModeData = { outOfView?: boolean } & (
  | {
      mode: 'default'
    }
  | {
      mode: 'selectionFrame'
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
)
