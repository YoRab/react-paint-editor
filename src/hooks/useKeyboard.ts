import { useEffect, useState } from 'react'
import { DrawableShape } from 'types/Shapes'
import _ from 'lodash/fp'
import { copyShape } from 'utils/data'
import { KeyboardCode, KeyboardCommand } from 'types/keyboard'

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
          updateShape(
            _.set(
              'translation',
              [selectedShape.translation[0] - 1, selectedShape.translation[1]],
              selectedShape
            )
          )
          break
        case KeyboardCode.ArrowRight:
          updateShape(
            _.set(
              'translation',
              [selectedShape.translation[0] + 1, selectedShape.translation[1]],
              selectedShape
            )
          )
          break
        case KeyboardCode.ArrowDown:
          updateShape(
            _.set(
              'translation',
              [selectedShape.translation[0], selectedShape.translation[1] + 1],
              selectedShape
            )
          )
          break
        case KeyboardCode.ArrowUp:
          updateShape(
            _.set(
              'translation',
              [selectedShape.translation[0], selectedShape.translation[1] - 1],
              selectedShape
            )
          )
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
