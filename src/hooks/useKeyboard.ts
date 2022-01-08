import { useCallback, useEffect, useState } from 'react'
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
  isEditingText: boolean
}

export const useKeyboard = ({
  isInsideComponent,
  selectedShape,
  isEditingText,
  setSelectedShape,
  removeShape,
  pasteShape,
  updateShape
}: UseKeyboardType) => {
  const [copiedShape, setCopiedShape] = useState<DrawableShape | undefined>(undefined)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedShape) return

      if (e.code === KeyboardCode.Escape) {
        setSelectedShape(undefined)
        return
      }
      if (isEditingText) return
      switch (e.code) {
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
          removeShape(selectedShape)
          break
      }
    },
    [isEditingText, selectedShape, updateShape, removeShape, setSelectedShape]
  )

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!selectedShape) return
      if (isEditingText) return

      e.preventDefault()
      setCopiedShape({ ...selectedShape })
    },
    [selectedShape, isEditingText]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!copiedShape) return
      if (isEditingText) return
      e.preventDefault()
      pasteShape(copyShape(copiedShape))
    },
    [copiedShape, isEditingText, pasteShape]
  )

  useEffect(() => {
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
  }, [isInsideComponent, handleKeyDown, handleCopy, handlePaste])

  return {}
}
