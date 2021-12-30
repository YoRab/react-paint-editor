import { RefObject, useCallback, useEffect, useState } from 'react'
import { DrawableShape } from 'types/Shapes'
import _ from 'lodash/fp'
import { copyShape } from 'utils/data'
import { KeyboardCommand } from 'types/keyboard'

type UseKeyboardType = {
  selectedShape: DrawableShape | undefined
  onPasteShape: (shape: DrawableShape) => void
  componentRef: RefObject<HTMLElement>
}

export const useKeyboard = ({ componentRef, selectedShape, onPasteShape }: UseKeyboardType) => {
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
      if (!isInsideComponent || !selectedShape) return
      console.log(` ${e.code}`)
      console.log(e.keyCode)
    },
    [isInsideComponent, selectedShape]
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!isInsideComponent || !selectedShape) return

      console.log(` ${e.code}`)
    },
    [isInsideComponent, selectedShape]
  )

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!isInsideComponent || !selectedShape) return
      e.preventDefault()
      setCopiedShape({ ...selectedShape })
    },
    [isInsideComponent, selectedShape]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!isInsideComponent || !copiedShape) return
      e.preventDefault()
      onPasteShape(copyShape(copiedShape))
    },
    [isInsideComponent, copiedShape, onPasteShape]
  )

  useEffect(() => {
    document.addEventListener('mouseup', onDetectClick)
    document.addEventListener('touchend', onDetectClick)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener(KeyboardCommand.Copy, handleCopy)
    document.addEventListener(KeyboardCommand.Paste, handlePaste)

    return () => {
      document.removeEventListener('mouseup', onDetectClick)
      document.removeEventListener('touchend', onDetectClick)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener(KeyboardCommand.Copy, handleCopy)
      document.removeEventListener(KeyboardCommand.Paste, handlePaste)
    }
  }, [onDetectClick, handleKeyDown, handleKeyUp, handleCopy, handlePaste])
}
