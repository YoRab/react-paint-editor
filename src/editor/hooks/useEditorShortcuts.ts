import type { ReactPaint } from '@canvas/index'
import { ACTION_SHORTCUTS, HELP_SHORTCUT, matchesShortcut, type Shortcut, TOOL_SHORTCUTS } from '@editor/constants/shortcuts'
import useLatest from '@editor/hooks/useLatest'
import { type RefObject, useEffect } from 'react'

type EditorShortcutsOptions = {
  /** The element the keys are listened on: the root of the editor, which is the scope of the canvas */
  scopeRef: RefObject<HTMLElement | null>
  /** The tools can be chosen: the editor is not disabled */
  enabled: boolean
  /** Ids of the tools shown, which their letter chooses */
  toolIds: readonly string[]
  selectTool: (id: string) => void
  /** Each action is given only when its option shows it */
  saveFile?: (() => void) | undefined
  openFile?: (() => void) | undefined
  openExport?: (() => void) | undefined
  openHelp: () => void
}

/** The keys of a field, and of a dialog of the editor, are left to them */
const isOutOfShortcuts = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && (target.isContentEditable || target.closest('[aria-modal="true"]') !== null))

/**
 * Shortcuts of the editor: a letter chooses a tool, Ctrl+S, Ctrl+O and Ctrl+Shift+E save, open and export, ? lists the
 * shortcuts. They are listened on the scope next to the shortcuts of the canvas, and take other keys than them. They are
 * active only while the focus is inside the editor: the letters stay with the rest of the page (WCAG 2.1.4)
 */
const useEditorShortcuts = (paint: ReactPaint, options: EditorShortcutsOptions) => {
  const latest = useLatest(options)
  const { scopeRef } = options

  useEffect(() => {
    const scope = scopeRef.current
    if (!scope) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // the keys of the shortcuts are single characters, like a letter or ?
      if (e.key.length !== 1 || e.defaultPrevented || isOutOfShortcuts(e.target)) return
      const { interaction } = paint.getState()
      // a text being edited takes its letters
      if (interaction.mode === 'textedition') return
      const { enabled, toolIds, selectTool, saveFile, openFile, openExport, openHelp } = latest.current
      // like on the canvas, Shift is read from the keys pressed in the scope
      const isShiftPressed = interaction.modifiers.shift
      const matches = (shortcut: Shortcut | undefined) => shortcut !== undefined && matchesShortcut(e, shortcut, isShiftPressed)

      const run = (action: () => void) => {
        e.preventDefault()
        // a key held repeats: the picker of a file or a dialog opens once
        if (!e.repeat) action()
      }

      if (enabled) {
        const toolId = toolIds.find(id => matches(TOOL_SHORTCUTS[id]))
        if (toolId !== undefined) return run(() => selectTool(toolId))
        if (saveFile && matches(ACTION_SHORTCUTS.savefile)) return run(saveFile)
        if (openFile && matches(ACTION_SHORTCUTS.loadfile)) return run(openFile)
        if (openExport && matches(ACTION_SHORTCUTS.export)) return run(openExport)
      }
      if (matches(HELP_SHORTCUT)) run(openHelp)
    }

    scope.addEventListener('keydown', handleKeyDown)
    return () => scope.removeEventListener('keydown', handleKeyDown)
  }, [paint, scopeRef, latest])
}

export default useEditorShortcuts
