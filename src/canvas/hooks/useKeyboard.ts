import { KeyboardCode, KeyboardCommand } from '@canvas/constants/keyboard'
import { SELECTION_TOOL } from '@canvas/constants/tools'
import type { PaintStore } from '@canvas/store/paintStore'
import type { Point } from '@canvas/types/Shapes'
import { getSelectedShapes } from '@canvas/utils/selectedShapes'
import { translateShapes } from '@canvas/utils/shapes'
import { isMacOs } from '@canvas/utils/util'
import { useEffect } from 'react'

/**
 * Keyboard shortcuts and modifiers. The listeners are set once, and read the state when an event happens:
 * they only act while the focus is inside the editor.
 */
const useKeyboard = (store: PaintStore) => {
  useEffect(() => {
    const isInsideComponent = () => store.getState().interaction.focus.component
    const isEditingText = () => store.getState().interaction.selectionMode.mode === 'textedition'
    const hasSelection = () => store.getState().document.selectedShape !== undefined

    const handleCopy = (e: ClipboardEvent) => {
      if (!isInsideComponent() || !hasSelection() || isEditingText()) return
      e.preventDefault()
      store.actions.copy()
    }

    const handleCut = (e: ClipboardEvent) => {
      if (!isInsideComponent() || !hasSelection() || isEditingText()) return
      e.preventDefault()
      store.actions.cut()
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (!isInsideComponent() || store.getState().clipboard === undefined || isEditingText()) return
      e.preventDefault()
      store.actions.paste()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isInsideComponent()) return
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
      if (!isInsideComponent()) return
      if (e.metaKey || e.ctrlKey) {
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

      const { selectedShape } = store.getState().document
      if (!selectedShape) return

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

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener(KeyboardCommand.Copy, handleCopy)
    document.addEventListener(KeyboardCommand.Paste, handlePaste)
    document.addEventListener(KeyboardCommand.Cut, handleCut)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener(KeyboardCommand.Copy, handleCopy)
      document.removeEventListener(KeyboardCommand.Paste, handlePaste)
      document.removeEventListener(KeyboardCommand.Cut, handleCut)
    }
  }, [store])
}

export default useKeyboard
