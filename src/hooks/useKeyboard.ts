import { useEffect, useState } from 'react'
import type { DrawableShape } from 'types/Shapes'
import _ from 'lodash/fp'
import { copyShape } from 'utils/data'
import { translateShape } from 'utils/transform'

const KeyboardCode = {
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Escape: 'Escape',
  Z: 'z',
  Y: 'y'
} as const

const KeyboardCommand = {
  Copy: 'copy',
  Paste: 'paste'
} as const

type UseKeyboardType = {
  isInsideComponent: boolean
  selectedShape: DrawableShape | undefined
  pasteShape: (shape: DrawableShape) => void
  updateShape: (shape: DrawableShape) => void
  setSelectedShape: (value: React.SetStateAction<DrawableShape | undefined>) => void
  removeShape: (shape: DrawableShape) => void
  backwardShape: () => void
  forwardShape: () => void
  isEditingText: boolean
}

const useKeyboard = ({
  isInsideComponent,
  selectedShape,
  isEditingText,
  setSelectedShape,
  removeShape,
  pasteShape,
  updateShape,
  backwardShape,
  forwardShape
}: UseKeyboardType) => {
  const [copiedShape, setCopiedShape] = useState<DrawableShape | undefined>(undefined)

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!selectedShape) return
      if (isEditingText) return

      e.preventDefault()
      setCopiedShape({ ...selectedShape })
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (!copiedShape) return
      if (isEditingText) return
      e.preventDefault()
      pasteShape(copyShape(copiedShape))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === KeyboardCode.Z) {
          e.preventDefault()
          e.stopPropagation()
          backwardShape()
          return
        } else if (e.key === KeyboardCode.Y) {
          e.preventDefault()
          e.stopPropagation()
          forwardShape()
          return
        }
      }

      if (!selectedShape) return

      if (e.key === KeyboardCode.Escape) {
        setSelectedShape(undefined)
        return
      }
      if (isEditingText) return
      switch (e.key) {
        case KeyboardCode.ArrowLeft:
          updateShape(translateShape([-1, 0], selectedShape, [0, 0]))
          break
        case KeyboardCode.ArrowRight:
          updateShape(translateShape([1, 0], selectedShape, [0, 0]))
          break
        case KeyboardCode.ArrowDown:
          updateShape(translateShape([0, 1], selectedShape, [0, 0]))
          break
        case KeyboardCode.ArrowUp:
          updateShape(translateShape([0, -1], selectedShape, [0, 0]))
          break
        case KeyboardCode.Delete:
        case KeyboardCode.Backspace:
          removeShape(selectedShape)
          break
      }
    }

    if (isInsideComponent) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener(KeyboardCommand.Copy, handleCopy)
      document.addEventListener(KeyboardCommand.Paste, handlePaste)
    }

    return () => {
      if (isInsideComponent) {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener(KeyboardCommand.Copy, handleCopy)
        document.removeEventListener(KeyboardCommand.Paste, handlePaste)
      }
    }
  }, [
    isInsideComponent,
    copiedShape,
    isEditingText,
    selectedShape,
    updateShape,
    removeShape,
    setSelectedShape,
    pasteShape,
    backwardShape,
    forwardShape
  ])

  return {}
}

export default useKeyboard
