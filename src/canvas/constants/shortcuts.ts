/**
 * A key of the keyboard, with the modifiers it is pressed with. Ctrl is ⌘ on macOS. A letter is read whatever Caps Lock, and
 * the modifiers are given exactly: Shift too, unless it is 'any' (a sign, like ?, comes with or without it on the layouts)
 */
export type Shortcut = {
  /** A character, or the name of a key (KeyboardEvent.key) */
  key: string
  ctrl?: boolean
  shift?: boolean | 'any'
  /** Other characters which give the shortcut: Ctrl+= zooms in, as Ctrl++ does */
  otherKeys?: readonly string[]
  /** Physical keys (KeyboardEvent.code) which give the shortcut too: the digits and the signs move between the layouts */
  codes?: readonly string[]
}

/**
 * The shortcuts of the canvas, which it listens while its scope has the focus. The Editor shows them in its menus and in the
 * list of its shortcuts, and avoids them for its own. Only the commands of useKeyboard are matched through this table: remove,
 * removeAlt, escape, enter, nextShape, previousShape and contextMenu depend on what is selected or being done, they are
 * handled where it is known and are listed here to be shown
 */
export const CANVAS_SHORTCUTS = {
  undo: { key: 'z', ctrl: true },
  redo: { key: 'z', ctrl: true, shift: true },
  // the redo of the other systems than macOS
  redoAlt: { key: 'y', ctrl: true },
  cut: { key: 'x', ctrl: true },
  copy: { key: 'c', ctrl: true },
  paste: { key: 'v', ctrl: true },
  duplicate: { key: 'd', ctrl: true },
  remove: { key: 'Delete' },
  removeAlt: { key: 'Backspace' },
  selectAll: { key: 'a', ctrl: true },
  group: { key: 'g', ctrl: true },
  ungroup: { key: 'g', ctrl: true, shift: true },
  forward: { key: ']', ctrl: true, codes: ['BracketRight'] },
  backward: { key: '[', ctrl: true, codes: ['BracketLeft'] },
  first: { key: ']', ctrl: true, shift: true, codes: ['BracketRight'] },
  last: { key: '[', ctrl: true, shift: true, codes: ['BracketLeft'] },
  flipHorizontally: { key: 'h', shift: true },
  flipVertically: { key: 'v', shift: true },
  lock: { key: 'l', ctrl: true, shift: true },
  hide: { key: 'h', ctrl: true, shift: true },
  zoomIn: { key: '+', ctrl: true, shift: 'any', otherKeys: ['='], codes: ['Equal', 'NumpadAdd'] },
  zoomOut: { key: '-', ctrl: true, shift: 'any', codes: ['Minus', 'NumpadSubtract'] },
  resetZoom: { key: '0', ctrl: true, shift: 'any', codes: ['Digit0', 'Numpad0'] },
  zoomToFit: { key: '1', shift: true, codes: ['Digit1'] },
  zoomToSelection: { key: '2', shift: true, codes: ['Digit2'] },
  contextMenu: { key: 'F10', shift: true },
  escape: { key: 'Escape' },
  enter: { key: 'Enter' },
  nextShape: { key: 'Tab' },
  previousShape: { key: 'Tab', shift: true }
} as const satisfies Record<string, Shortcut>

/** Whether the event is the shortcut. Shift is the one of the state of the canvas, which follows the keys pressed in its scope */
export const matchesShortcut = (
  e: KeyboardEvent,
  { key, ctrl = false, shift = false, otherKeys, codes }: Shortcut,
  isShiftPressed: boolean
): boolean => {
  if ((e.ctrlKey || e.metaKey) !== ctrl) return false
  // Alt alone is another shortcut. With Ctrl it may be AltGr, which gives the brackets and the signs on some layouts: the
  // character is the one wanted, and the physical key is another one of the shortcuts
  if (e.altKey && !ctrl) return false
  if (shift !== 'any' && shift !== isShiftPressed) return false
  return e.key.toLowerCase() === key.toLowerCase() || (otherKeys?.includes(e.key) ?? false) || (!e.altKey && (codes?.includes(e.code) ?? false))
}

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
  if (isMac) return `${shift === true ? '⇧' : ''}${ctrl ? '⌘' : ''}${name}`
  return [ctrl && 'Ctrl', shift === true && 'Maj', name].filter(Boolean).join('+')
}

/** Value of aria-keyshortcuts: Control+Shift+E, or Meta+Shift+E on macOS */
export const getAriaKeyShortcut = ({ key, ctrl, shift }: Shortcut, isMac: boolean): string =>
  [ctrl && (isMac ? 'Meta' : 'Control'), shift === true && 'Shift', key.length === 1 ? key.toUpperCase() : key].filter(Boolean).join('+')
