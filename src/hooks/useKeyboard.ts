import { useEffect, useState } from 'react'
import type { UtilsSettings } from '../constants/app'
import { GRID_STEP } from '../constants/style'
import type { Point, ShapeEntity } from '../types/Shapes'
import { copyShape, translateShape } from '../utils/shapes'

const KeyboardCode = {
	ArrowUp: 'ArrowUp',
	ArrowDown: 'ArrowDown',
	ArrowLeft: 'ArrowLeft',
	ArrowRight: 'ArrowRight',
	Delete: 'Delete',
	Backspace: 'Backspace',
	Escape: 'Escape',
	Shift: 'Shift',
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
	selectedShape: ShapeEntity | undefined
	pasteShape: (shape: ShapeEntity) => void
	updateShape: (shape: ShapeEntity) => void
	setSelectedShape: (value: React.SetStateAction<ShapeEntity | undefined>) => void
	removeShape: (shape: ShapeEntity) => void
	backwardShape: () => void
	forwardShape: () => void
	setShiftPressed: (value: React.SetStateAction<boolean>) => void
	isEditingText: boolean
	settings: UtilsSettings
}

const useKeyboard = ({
	isInsideComponent,
	selectedShape,
	isEditingText,
	settings,
	setSelectedShape,
	removeShape,
	pasteShape,
	updateShape,
	backwardShape,
	forwardShape,
	setShiftPressed
}: UseKeyboardType) => {
	const [copiedShape, setCopiedShape] = useState<ShapeEntity | undefined>(undefined)

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
			pasteShape(copyShape(copiedShape, settings))
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			switch (e.key) {
				case KeyboardCode.Shift:
					setShiftPressed(false)
					break
			}
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey) {
				if (e.key === KeyboardCode.Z || e.key === KeyboardCode.z) {
					e.preventDefault()
					e.stopPropagation()
					backwardShape()
					return
				}
				if (e.key === KeyboardCode.Y || e.key === KeyboardCode.y) {
					e.preventDefault()
					e.stopPropagation()
					forwardShape()
					return
				}
			}

			if (e.key === KeyboardCode.Shift) {
				setShiftPressed(true)
				return
			}

			if (!selectedShape) return

			if (e.key === KeyboardCode.Escape) {
				setSelectedShape(undefined)
				return
			}
			if (isEditingText) return

			const translationMap: { [key: string]: Point } = {
				[KeyboardCode.ArrowLeft]: [settings.gridFormat ? -GRID_STEP[settings.gridFormat - 1] : -1, 0],
				[KeyboardCode.ArrowRight]: [settings.gridFormat ? GRID_STEP[settings.gridFormat - 1] : 1, 0],
				[KeyboardCode.ArrowDown]: [0, settings.gridFormat ? GRID_STEP[settings.gridFormat - 1] : 1],
				[KeyboardCode.ArrowUp]: [0, settings.gridFormat ? -GRID_STEP[settings.gridFormat - 1] : -1]
			}
			switch (e.key) {
				case KeyboardCode.ArrowLeft:
				case KeyboardCode.ArrowRight:
				case KeyboardCode.ArrowDown:
				case KeyboardCode.ArrowUp:
					updateShape(translateShape(translationMap[e.key], selectedShape, [0, 0], settings))
					break
				case KeyboardCode.Delete:
				case KeyboardCode.Backspace:
					removeShape(selectedShape)
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
		updateShape,
		removeShape,
		setSelectedShape,
		pasteShape,
		backwardShape,
		forwardShape,
		setShiftPressed
	])

	return {}
}

export default useKeyboard
