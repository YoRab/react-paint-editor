import { CANVAS_SHORTCUTS, type Shortcut } from '@canvas/index'
import { ACTION_SHORTCUTS, HELP_SHORTCUT, TOOL_SHORTCUTS } from '@editor/constants/shortcuts'
import { describe, expect, it } from 'vitest'

// The canvas and the editor listen the same scope: a key is handled by only one of them
describe('shortcuts of the editor', () => {
  // Shift 'any' is both with and without Shift
  const getIds = ({ key, ctrl = false, shift = false }: Shortcut) =>
    (shift === 'any' ? [false, true] : [shift]).map(isShift => `${ctrl}|${isShift}|${key.toLowerCase()}`)

  const own = [...Object.values(TOOL_SHORTCUTS), ...Object.values(ACTION_SHORTCUTS), HELP_SHORTCUT]
  // the undo and the redo are the ones of the canvas
  const ownIds = own.filter(shortcut => shortcut !== CANVAS_SHORTCUTS.undo && shortcut !== CANVAS_SHORTCUTS.redo).flatMap(getIds)

  it('has no two shortcuts on the same keys', () => {
    expect(new Set(ownIds).size).toBe(ownIds.length)
  })

  it('does not take a key of the canvas', () => {
    const canvasIds = new Set(Object.values(CANVAS_SHORTCUTS).flatMap(getIds))
    expect(ownIds.filter(id => canvasIds.has(id))).toEqual([])
  })
})
