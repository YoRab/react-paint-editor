import { DEFAULT_TOOLS, ERASER_TOOL, LASER_TOOL, MOVE_TOOL, SELECTION_TOOL, type ShapeType } from '@canvas/index'
import type { EditorActionType } from '@editor/types/tools'

/** Keys of a shortcut: a character or the name of a key (KeyboardEvent.key). Ctrl is ⌘ on macOS */
export type Shortcut = { key: string; ctrl?: boolean; shift?: boolean }

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
  undo: { key: 'z', ctrl: true },
  redo: { key: 'z', ctrl: true, shift: true },
  loadfile: { key: 'o', ctrl: true },
  savefile: { key: 's', ctrl: true },
  export: { key: 'e', ctrl: true, shift: true }
}

/** Name of the list of the shortcuts, and the shortcut which opens it */
export const HELP_LABEL = 'Raccourcis clavier'
export const HELP_SHORTCUT: Shortcut = { key: '?' }

/** Shortcuts of the canvas, shown in its context menu and in the list of the shortcuts */
export const CANVAS_SHORTCUTS = {
  cut: { key: 'x', ctrl: true },
  copy: { key: 'c', ctrl: true },
  paste: { key: 'v', ctrl: true },
  duplicate: { key: 'd', ctrl: true },
  remove: { key: 'Delete' },
  selectAll: { key: 'a', ctrl: true },
  group: { key: 'g', ctrl: true },
  ungroup: { key: 'g', ctrl: true, shift: true },
  forward: { key: ']', ctrl: true },
  backward: { key: '[', ctrl: true },
  first: { key: ']', ctrl: true, shift: true },
  last: { key: '[', ctrl: true, shift: true },
  flipHorizontally: { key: 'h', shift: true },
  flipVertically: { key: 'v', shift: true },
  lock: { key: 'l', ctrl: true, shift: true },
  hide: { key: 'h', ctrl: true, shift: true },
  zoomIn: { key: '+', ctrl: true },
  zoomOut: { key: '-', ctrl: true },
  resetZoom: { key: '0', ctrl: true },
  zoomToFit: { key: '1', shift: true },
  zoomToSelection: { key: '2', shift: true },
  contextMenu: { key: 'F10', shift: true },
  escape: { key: 'Escape' },
  enter: { key: 'Enter' }
} as const satisfies Record<string, Shortcut>

const KEY_LABELS: Record<string, string> = {
  Delete: 'Suppr',
  Backspace: 'Retour arrière',
  Escape: 'Échap',
  Enter: 'Entrée',
  Tab: 'Tab'
}

/** Text of a shortcut, as the menus of the system show it: Ctrl+Maj+E, or ⇧⌘E on macOS */
export const formatShortcut = ({ key, ctrl, shift }: Shortcut, isMac: boolean): string => {
  const name = KEY_LABELS[key] ?? key.toUpperCase()
  if (isMac) return `${shift ? '⇧' : ''}${ctrl ? '⌘' : ''}${name}`
  return [ctrl && 'Ctrl', shift && 'Maj', name].filter(Boolean).join('+')
}

/** Value of aria-keyshortcuts: Control+Shift+E, or Meta+Shift+E on macOS */
export const getAriaKeyShortcut = ({ key, ctrl, shift }: Shortcut, isMac: boolean): string =>
  [ctrl && (isMac ? 'Meta' : 'Control'), shift && 'Shift', key.length === 1 ? key.toUpperCase() : key].filter(Boolean).join('+')

/** Whether the event is the shortcut: a letter whatever Caps Lock, Ctrl and Shift given exactly, without Alt */
export const matchesShortcut = (e: KeyboardEvent, { key, ctrl = false, shift = false }: Shortcut, isShiftPressed: boolean): boolean =>
  e.key.toLowerCase() === key.toLowerCase() && (e.ctrlKey || e.metaKey) === ctrl && !e.altKey && (key === '?' || isShiftPressed === shift)
