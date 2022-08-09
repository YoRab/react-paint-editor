import type { GridFormatType } from 'constants/app'
import { GRID_STEP } from 'constants/style'
import { useEffect, useState } from 'react'
import type { DrawableShape, Point } from 'types/Shapes'
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
  gridFormat: GridFormatType
}

const useKeyboard = ({
  gridFormat,
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
      pasteShape(copyShape(copiedShape, gridFormat))
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
      const translationMap: { [key: string]: Point } = {
        [KeyboardCode.ArrowLeft]: [gridFormat ? -GRID_STEP[gridFormat - 1] : -1, 0],
        [KeyboardCode.ArrowRight]: [gridFormat ? GRID_STEP[gridFormat - 1] : 1, 0],
        [KeyboardCode.ArrowDown]: [0, gridFormat ? GRID_STEP[gridFormat - 1] : 1],
        [KeyboardCode.ArrowUp]: [0, gridFormat ? -GRID_STEP[gridFormat - 1] : -1]
      }
      switch (e.key) {
        case KeyboardCode.ArrowLeft:
        case KeyboardCode.ArrowRight:
        case KeyboardCode.ArrowDown:
        case KeyboardCode.ArrowUp:
          updateShape(translateShape(translationMap[e.key], selectedShape, [0, 0], gridFormat))
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
    gridFormat,
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
