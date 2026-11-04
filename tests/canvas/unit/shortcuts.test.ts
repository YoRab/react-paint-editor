import { DEFAULT_CANVAS_LABELS } from '@canvas/constants/app'
import { CANVAS_SHORTCUTS, formatShortcut, getAriaKeyShortcut, matchesShortcut, type Shortcut } from '@canvas/constants/shortcuts'
import { describe, expect, it } from 'vitest'

// the tests run without a DOM: the event holds the fields the shortcuts read
const press = (init: Partial<Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>>) =>
  ({ key: '', code: '', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...init }) as KeyboardEvent

describe('matchesShortcut', () => {
  const undo: Shortcut = { key: 'z', ctrl: true }

  it('reads a letter whatever Caps Lock, with Ctrl or ⌘', () => {
    expect(matchesShortcut(press({ key: 'z', ctrlKey: true }), undo, false)).toBe(true)
    expect(matchesShortcut(press({ key: 'Z', metaKey: true }), undo, false)).toBe(true)
    expect(matchesShortcut(press({ key: 'z' }), undo, false)).toBe(false)
    expect(matchesShortcut(press({ key: 'y', ctrlKey: true }), undo, false)).toBe(false)
  })

  it('gives Ctrl and Shift exactly', () => {
    expect(matchesShortcut(press({ key: 'z', ctrlKey: true }), undo, true)).toBe(false)
    expect(matchesShortcut(press({ key: 'z', ctrlKey: true }), CANVAS_SHORTCUTS.redo, true)).toBe(true)
    expect(matchesShortcut(press({ key: 'h' }), CANVAS_SHORTCUTS.flipHorizontally, false)).toBe(false)
    expect(matchesShortcut(press({ key: 'H' }), CANVAS_SHORTCUTS.flipHorizontally, true)).toBe(true)
    // Ctrl+Shift+H hides, Shift+H flips
    expect(matchesShortcut(press({ key: 'H', ctrlKey: true }), CANVAS_SHORTCUTS.flipHorizontally, true)).toBe(false)
    expect(matchesShortcut(press({ key: 'H', ctrlKey: true }), CANVAS_SHORTCUTS.hide, true)).toBe(true)
  })

  it('ignores Shift when the shortcut says any', () => {
    const help: Shortcut = { key: '?', shift: 'any' }
    expect(matchesShortcut(press({ key: '?' }), help, false)).toBe(true)
    expect(matchesShortcut(press({ key: '?' }), help, true)).toBe(true)
    expect(matchesShortcut(press({ key: '+', ctrlKey: true }), CANVAS_SHORTCUTS.zoomIn, false)).toBe(true)
    expect(matchesShortcut(press({ key: '+', ctrlKey: true }), CANVAS_SHORTCUTS.zoomIn, true)).toBe(true)
  })

  it('reads the digits and the signs from their physical key, whatever the layout', () => {
    // Ctrl+0 gives à on an AZERTY keyboard, Ctrl+= gives =, Shift+1 gives & or !
    expect(matchesShortcut(press({ key: 'à', code: 'Digit0', ctrlKey: true }), CANVAS_SHORTCUTS.resetZoom, false)).toBe(true)
    expect(matchesShortcut(press({ key: '=', code: 'Equal', ctrlKey: true }), CANVAS_SHORTCUTS.zoomIn, false)).toBe(true)
    expect(matchesShortcut(press({ key: '=', code: 'Digit0', ctrlKey: true }), CANVAS_SHORTCUTS.zoomIn, true)).toBe(true)
    expect(matchesShortcut(press({ key: '+', code: 'NumpadAdd', ctrlKey: true }), CANVAS_SHORTCUTS.zoomIn, false)).toBe(true)
    expect(matchesShortcut(press({ key: '1', code: 'Numpad1' }), CANVAS_SHORTCUTS.zoomToFit, true)).toBe(true)
    expect(matchesShortcut(press({ key: '!', code: 'Digit1' }), CANVAS_SHORTCUTS.zoomToFit, true)).toBe(true)
    expect(matchesShortcut(press({ key: '}', code: 'BracketRight', ctrlKey: true }), CANVAS_SHORTCUTS.first, true)).toBe(true)
    expect(matchesShortcut(press({ key: '!', code: 'Digit1' }), CANVAS_SHORTCUTS.zoomToSelection, true)).toBe(false)
  })

  it('leaves Alt to its own shortcuts, but with Ctrl it may be AltGr', () => {
    expect(matchesShortcut(press({ key: 'h', shiftKey: true, altKey: true }), CANVAS_SHORTCUTS.flipHorizontally, true)).toBe(false)
    expect(matchesShortcut(press({ key: ']', code: 'Minus', ctrlKey: true, altKey: true }), CANVAS_SHORTCUTS.forward, false)).toBe(true)
    // AltGr + ) is the ] of an AZERTY keyboard, not the minus sign of its physical key
    expect(matchesShortcut(press({ key: ']', code: 'Minus', ctrlKey: true, altKey: true }), CANVAS_SHORTCUTS.zoomOut, false)).toBe(false)
  })
})

describe('formatShortcut', () => {
  it('writes the modifiers as the menus of the system do', () => {
    expect(formatShortcut(CANVAS_SHORTCUTS.ungroup, false)).toBe('Ctrl+Maj+G')
    expect(formatShortcut(CANVAS_SHORTCUTS.ungroup, true)).toBe('⇧⌘G')
    expect(formatShortcut(CANVAS_SHORTCUTS.first, false)).toBe('Ctrl+Maj+]')
    expect(formatShortcut(CANVAS_SHORTCUTS.contextMenu, false)).toBe('Maj+F10')
  })

  it('names the keys which have a name, and shows no Shift for a key which comes with or without it', () => {
    expect(formatShortcut(CANVAS_SHORTCUTS.remove, false)).toBe('Suppr')
    expect(formatShortcut(CANVAS_SHORTCUTS.escape, true)).toBe('Échap')
    expect(formatShortcut(CANVAS_SHORTCUTS.nextShape, false)).toBe('Tab')
    expect(formatShortcut({ key: '?', shift: 'any' }, false)).toBe('?')
  })
})

describe('getAriaKeyShortcut', () => {
  it('gives the names of the keys of aria-keyshortcuts', () => {
    expect(getAriaKeyShortcut(CANVAS_SHORTCUTS.duplicate, false)).toBe('Control+D')
    expect(getAriaKeyShortcut(CANVAS_SHORTCUTS.redo, true)).toBe('Meta+Shift+Z')
    expect(getAriaKeyShortcut(CANVAS_SHORTCUTS.remove, false)).toBe('Delete')
  })
})

describe('CANVAS_SHORTCUTS', () => {
  const entries = Object.entries(CANVAS_SHORTCUTS) as [string, Shortcut][]
  const getId = ({ key, ctrl = false, shift = false }: Shortcut) => `${ctrl}|${shift}|${key.toLowerCase()}`

  it('has no two shortcuts on the same keys', () => {
    const ids = entries.map(([, shortcut]) => getId(shortcut))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is told by the instructions read by the assistive technologies', () => {
    const { instructions, keyboardHintKey } = DEFAULT_CANVAS_LABELS
    for (const shortcut of [CANVAS_SHORTCUTS.duplicate, CANVAS_SHORTCUTS.forward, CANVAS_SHORTCUTS.backward, CANVAS_SHORTCUTS.contextMenu]) {
      expect(instructions).toContain(formatShortcut(shortcut, false))
    }
    expect(keyboardHintKey).toBe(formatShortcut(CANVAS_SHORTCUTS.enter, false))
  })
})
