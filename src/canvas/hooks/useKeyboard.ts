import { KeyboardCode, KeyboardCommand } from '@canvas/constants/keyboard'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import type { PaintStore } from '@canvas/store/paintStore'
import type { Point } from '@canvas/types/Shapes'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { translateShapes } from '@canvas/utils/shapes'
import { isMacOs } from '@canvas/utils/util'
import { useEffect } from 'react'

/** A field of a form, like one of the editor: the shortcuts leave it its keys and its clipboard */
const isFormField = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement

/**
 * Keyboard shortcuts and modifiers. The listeners are set once on the scope (the Canvas, or the area set by scopeRef),
 * which only receives the events while the focus is inside it, and read the state when an event happens.
 */
const useKeyboard = (store: PaintStore) => {
  useEffect(() => {
    const isInteractive = () => store.selectors.selectIsInteractive(store.getState())
    const isEditingText = () => store.getState().interaction.selectionMode.mode === 'textedition'
    const hasSelection = () => store.getState().document.selectedShape !== undefined

    // like a drag of the mouse, a move made with the arrows is saved once, when the last held arrow is released
    const pressedArrows = new Set<string>()

    const handleCopy = (e: ClipboardEvent) => {
      if (!isInteractive() || !hasSelection() || isEditingText() || isFormField(e.target)) return
      e.preventDefault()
      store.actions.copy()
    }

    const handleCut = (e: ClipboardEvent) => {
      if (!isInteractive() || !hasSelection() || isEditingText() || isFormField(e.target)) return
      e.preventDefault()
      store.actions.cut()
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (!isInteractive() || store.getState().clipboard === undefined || isEditingText() || isFormField(e.target)) return
      e.preventDefault()
      store.actions.paste()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // the move is saved even if the canvas is no longer interactive: it was made
      if (pressedArrows.delete(e.key) && !pressedArrows.size) store.actions.saveShapes()
      if (!isInteractive()) return
      switch (e.key) {
        case KeyboardCode.Shift:
          store.setModifiers({ shift: false })
          break
        case KeyboardCode.Alt:
        case KeyboardCode.Option:
          store.setModifiers({ alt: false })
          break
        case KeyboardCode.Space:
          store.setModifiers({ space: false })
          break
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInteractive()) return
      // only the modifiers are followed in a field
      const isInField = isFormField(e.target)
      if ((e.metaKey || e.ctrlKey) && !isInField) {
        if (e.key === KeyboardCode.Z || e.key === KeyboardCode.z) {
          e.preventDefault()
          e.stopPropagation()
          if (e.shiftKey) {
            store.actions.redo()
          } else {
            store.actions.undo()
          }
          return
        }
        if (!isMacOs() && (e.key === KeyboardCode.Y || e.key === KeyboardCode.y)) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.redo()
          return
        }

        if (e.key === KeyboardCode.A || e.key === KeyboardCode.a) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.selectAllShapes()
          return
        }

        if (e.key === KeyboardCode.Plus) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.setZoom('zoom')
          return
        }
        if (e.key === KeyboardCode.Minus) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.setZoom('unzoom')
          return
        }
        if (e.key === KeyboardCode.Zero) {
          e.preventDefault()
          e.stopPropagation()
          store.actions.resetZoom()
          return
        }
      }
      if (e.key === KeyboardCode.Shift) {
        e.preventDefault()
        e.stopPropagation()
        store.setModifiers({ shift: true })
        return
      }
      if (e.key === KeyboardCode.Space) {
        if (store.getState().interaction.focus.canvas) {
          e.preventDefault()
          e.stopPropagation()
          store.setModifiers({ space: true })
          return
        }
      }
      if (e.key === KeyboardCode.Alt || e.key === KeyboardCode.Option) {
        e.preventDefault()
        e.stopPropagation()
        store.setModifiers({ alt: true })
        return
      }

      // a stroke of the eraser is cancelled: it removes nothing. So is a pick of a color
      const { mode } = store.getState().interaction.selectionMode
      if (e.key === KeyboardCode.Escape && (mode === 'eraser' || mode === 'eyedropper')) {
        store.setSelectionMode({ mode: 'default' })
        return
      }

      const { selectedShape } = store.getState().document
      if (!selectedShape || isInField) return

      if (e.key === KeyboardCode.Escape) {
        store.batch(() => {
          store.setSelectedShape(undefined)
          store.setActiveTool(SELECTION_TOOL)
          store.setSelectionMode({ mode: 'default' })
          store.setSelectionFrame(undefined)
        })
        return
      }
      if (isEditingText()) return

      const { gridGap } = store.getSettings()
      const translationMap: { [key: string]: Point } = {
        [KeyboardCode.ArrowLeft]: [gridGap ? -gridGap : -1, 0],
        [KeyboardCode.ArrowRight]: [gridGap ? gridGap : 1, 0],
        [KeyboardCode.ArrowDown]: [0, gridGap ? gridGap : 1],
        [KeyboardCode.ArrowUp]: [0, gridGap ? -gridGap : -1]
      }
      switch (e.key) {
        case KeyboardCode.ArrowLeft:
        case KeyboardCode.ArrowRight:
        case KeyboardCode.ArrowDown:
        case KeyboardCode.ArrowUp:
          e.preventDefault()
          e.stopPropagation()
          pressedArrows.add(e.key)
          store.updateShapes(translateShapes(translationMap[e.key]!, selectedShape, [0, 0], store.getSettings(), true))
          break
        case KeyboardCode.Delete:
        case KeyboardCode.Backspace:
          e.preventDefault()
          e.stopPropagation()
          store.removeShapes(getSelectedShapes(selectedShape))
          break
      }
    }

    // the keys released outside of the scope are not received: the move ends when the focus leaves it
    const handleFocusOut = (e: FocusEvent) => {
      if (!pressedArrows.size || (e.relatedTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node))) return
      pressedArrows.clear()
      store.actions.saveShapes()
    }

    return store.listenScope({
      keydown: handleKeyDown,
      keyup: handleKeyUp,
      focusout: handleFocusOut,
      [KeyboardCommand.Copy]: handleCopy,
      [KeyboardCommand.Paste]: handlePaste,
      [KeyboardCommand.Cut]: handleCut
    })
  }, [store])
}

export default useKeyboard
