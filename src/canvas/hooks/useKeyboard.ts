import type { UtilsSettings } from '@canvas/constants/app'
import { getSelectedShapes } from '@canvas/utils/selection'
import { copyShapes, translateShapes } from '@canvas/utils/shapes'
import type { SelectionModeData } from '@common/types/Mode'
import type { Point, SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { ToolsType } from '@common/types/tools'
import { isMacOs } from '@common/utils/util'
import { SELECTION_TOOL } from '@editor/constants/tools'
import { useEffect, useState } from 'react'

const KeyboardCode = {
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Escape: 'Escape',
  Shift: 'Shift',
  Alt: 'Alt',
  Option: 'Option',
  z: 'z',
  Z: 'Z',
  y: 'y',
  Y: 'Y'
} as const

const KeyboardCommand = {
  Copy: 'copy',
  Paste: 'paste'
} as const

type UseKeyboardType = {
  isInsideComponent: boolean
  selectedShape: SelectionType | undefined
  pasteShapes: (shape: ShapeEntity[]) => void
  updateShapes: (shapes: ShapeEntity[]) => void
  setSelectedShape: (value: React.SetStateAction<SelectionType | undefined>) => void
  removeShape: (shape: ShapeEntity[]) => void
  backwardShape: () => void
  forwardShape: () => void
  setShiftPressed: (value: React.SetStateAction<boolean>) => void
  setAltPressed: (value: React.SetStateAction<boolean>) => void
  isEditingText: boolean
  setActiveTool: (tool: ToolsType) => void
  setSelectionMode: (mode: SelectionModeData<number | Point>) => void
  setSelectionFrame: (args: { oldSelection: SelectionType | undefined; frame: [Point, Point] } | undefined) => void
  settings: UtilsSettings
}

const useKeyboard = ({
  isInsideComponent,
  selectedShape,
  isEditingText,
  settings,
  setSelectedShape,
  setActiveTool,
  setSelectionMode,
  setSelectionFrame,
  removeShape,
  pasteShapes,
  updateShapes,
  backwardShape,
  forwardShape,
  setShiftPressed,
  setAltPressed
}: UseKeyboardType) => {
  const [copiedShape, setCopiedShape] = useState<SelectionType | undefined>(undefined)

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
      pasteShapes(copyShapes(copiedShape, settings))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case KeyboardCode.Shift:
          setShiftPressed(false)
          break
        case KeyboardCode.Alt:
        case KeyboardCode.Option:
          setAltPressed(false)
          break
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === KeyboardCode.Z || e.key === KeyboardCode.z) {
          e.preventDefault()
          e.stopPropagation()
          if (e.shiftKey) {
            forwardShape()
          } else {
            backwardShape()
          }
          return
        }
        if (!isMacOs() && (e.key === KeyboardCode.Y || e.key === KeyboardCode.y)) {
          e.preventDefault()
          e.stopPropagation()
          forwardShape()
          return
        }
      }
      if (e.key === KeyboardCode.Shift) {
        e.preventDefault()
        e.stopPropagation()
        setShiftPressed(true)
        return
      }
      if (e.key === KeyboardCode.Alt || e.key === KeyboardCode.Option) {
        e.preventDefault()
        e.stopPropagation()
        setAltPressed(true)
        return
      }

      if (!selectedShape) return

      if (e.key === KeyboardCode.Escape) {
        setSelectedShape(undefined)
        setActiveTool(SELECTION_TOOL)
        setSelectionMode({ mode: 'default' })
        setSelectionFrame(undefined)
        return
      }
      if (isEditingText) return

      const translationMap: { [key: string]: Point } = {
        [KeyboardCode.ArrowLeft]: [settings.gridGap ? -settings.gridGap : -1, 0],
        [KeyboardCode.ArrowRight]: [settings.gridGap ? settings.gridGap : 1, 0],
        [KeyboardCode.ArrowDown]: [0, settings.gridGap ? settings.gridGap : 1],
        [KeyboardCode.ArrowUp]: [0, settings.gridGap ? -settings.gridGap : -1]
      }
      switch (e.key) {
        case KeyboardCode.ArrowLeft:
        case KeyboardCode.ArrowRight:
        case KeyboardCode.ArrowDown:
        case KeyboardCode.ArrowUp:
          e.preventDefault()
          e.stopPropagation()
          updateShapes(translateShapes(translationMap[e.key]!, selectedShape, [0, 0], settings, false))
          break
        case KeyboardCode.Delete:
        case KeyboardCode.Backspace:
          e.preventDefault()
          e.stopPropagation()
          removeShape(getSelectedShapes(selectedShape))
          break
      }
    }

    if (isInsideComponent) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
      document.addEventListener(KeyboardCommand.Copy, handleCopy)
      document.addEventListener(KeyboardCommand.Paste, handlePaste)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('keyup', handleKeyUp)
        document.removeEventListener(KeyboardCommand.Copy, handleCopy)
        document.removeEventListener(KeyboardCommand.Paste, handlePaste)
      }
    }
  }, [
    isInsideComponent,
    copiedShape,
    isEditingText,
    selectedShape,
    settings,
    updateShapes,
    removeShape,
    setSelectedShape,
    pasteShapes,
    backwardShape,
    forwardShape,
    setShiftPressed,
    setAltPressed,
    setActiveTool,
    setSelectionMode,
    setSelectionFrame
  ])

  return {}
}

export default useKeyboard
