import { CANVAS_SHORTCUTS, DEFAULT_TOOLS, ERASER_TOOL, LASER_TOOL, MOVE_TOOL, SELECTION_TOOL, type ShapeType, type Shortcut } from '@canvas/index'
import type { EditorActionType } from '@editor/types/tools'

// the letters of the drawing tools, like the other drawing applications; Shift gives the regular variant of a shape
const DRAWING_TOOL_SHORTCUTS: [ShapeType, Shortcut][] = [
  ['brush', { key: 'b' }],
  ['line', { key: 'l' }],
  ['polygon', { key: 'p' }],
  ['curve', { key: 'c' }],
  ['rect', { key: 'r' }],
  ['square', { key: 'r', shift: true }],
  ['ellipse', { key: 'o' }],
  ['circle', { key: 'o', shift: true }],
  ['text', { key: 't' }]
]

/** Shortcuts of the tools of the canvas and of its default drawing tools, by id: the tools of the consumer have none */
export const TOOL_SHORTCUTS: Readonly<Record<string, Shortcut>> = {
  [SELECTION_TOOL.id]: { key: 'v' },
  [MOVE_TOOL.id]: { key: 'h' },
  [ERASER_TOOL.id]: { key: 'e' },
  [LASER_TOOL.id]: { key: 'k' },
  ...Object.fromEntries(
    DRAWING_TOOL_SHORTCUTS.flatMap(([type, shortcut]) => {
      const id = DEFAULT_TOOLS.find(tool => tool.type === type)?.id
      return id ? [[id, shortcut]] : []
    })
  )
}

/** Shortcuts of the actions of the editor, handled by the canvas for the undo and the redo */
export const ACTION_SHORTCUTS: Readonly<Partial<Record<EditorActionType, Shortcut>>> = {
  undo: CANVAS_SHORTCUTS.undo,
  redo: CANVAS_SHORTCUTS.redo,
  loadfile: { key: 'o', ctrl: true },
  savefile: { key: 's', ctrl: true },
  export: { key: 'e', ctrl: true, shift: true }
}

/** The shortcut which opens the list of the shortcuts */
export const HELP_SHORTCUT: Shortcut = { key: '?', shift: 'any' }
