import { RefObject, useCallback, useEffect, useState } from 'react'
import { DrawableShape, Point } from 'types/Shapes'
import _ from 'lodash/fp'
import { copyShape } from 'utils/data'
import { KeyboardCode, KeyboardCommand } from 'types/keyboard'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'

type UseKeyboardType = {
  selectedShape: DrawableShape | undefined
  onPasteShape: (shape: DrawableShape) => void
  componentRef: RefObject<HTMLElement>
  updateShape: (shape: DrawableShape) => void
  setSelectedShape: (value: React.SetStateAction<DrawableShape | undefined>) => void
  removeShape: (shape: DrawableShape) => void
  selectionMode: SelectionModeData<Point | number>
}

export const useKeyboard = ({
  componentRef,
  selectedShape,
  selectionMode,
  setSelectedShape,
  removeShape,
  onPasteShape,
  updateShape
}: UseKeyboardType) => {
  const [copiedShape, setCopiedShape] = useState<DrawableShape | undefined>(undefined)
  const [isInsideComponent, setIsInsideComponent] = useState(false)

  const onDetectClick = useCallback(
    (event: MouseEvent | TouchEvent) => {
      setIsInsideComponent(
        !(event.target instanceof HTMLElement) || !componentRef.current
          ? false
          : componentRef.current.contains(event.target)
      )
    },
    [componentRef]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedShape) return

      if (e.code === KeyboardCode.Escape) {
        setSelectedShape(undefined)
        return
      }
      if (selectionMode.mode === SelectionModeLib.textedition) return
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
    [selectionMode, selectedShape, updateShape, removeShape, setSelectedShape]
  )

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!selectedShape) return
      if (selectionMode.mode === SelectionModeLib.textedition) return

      e.preventDefault()
      setCopiedShape({ ...selectedShape })
    },
    [selectedShape, selectionMode]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!copiedShape) return
      if (selectionMode.mode === SelectionModeLib.textedition) return
      e.preventDefault()
      onPasteShape(copyShape(copiedShape))
    },
    [copiedShape, selectionMode, onPasteShape]
  )

  useEffect(() => {
    document.addEventListener('mousedown', onDetectClick)
    document.addEventListener('touchstart', onDetectClick)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener(KeyboardCommand.Copy, handleCopy)
    document.addEventListener(KeyboardCommand.Paste, handlePaste)

    return () => {
      document.removeEventListener('mousedown', onDetectClick)
      document.removeEventListener('touchstart', onDetectClick)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener(KeyboardCommand.Copy, handleCopy)
      document.removeEventListener(KeyboardCommand.Paste, handlePaste)
    }
  }, [onDetectClick, handleKeyDown, handleCopy, handlePaste])

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

  return { isInsideComponent }
}
