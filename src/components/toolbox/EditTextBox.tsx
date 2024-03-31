import React, { useEffect, useMemo, useRef } from 'react'
import { STYLE_FONT_DEFAULT } from '../../constants/style'
import type { DrawableShape } from '../../types/Shapes'
import { getShapeInfos } from '../../utils/shapes'
import { convertDivContentToStringArray, convertStringArrayToDivContent } from '../../utils/string'
import { radiansToDegrees, rotatePoint } from '../../utils/trigo'
import './EditTextBox.css'

type EditTextBoxType = {
	scaleRatio: number
	disabled?: boolean
	shape: DrawableShape<'text'>
	defaultValue: string[]
	selectionPadding: number
	updateValue: (newValue: string[]) => void
	saveShapes: () => void
}

const EditTextBox = ({ disabled = false, scaleRatio, shape, defaultValue, updateValue, saveShapes, selectionPadding }: EditTextBoxType) => {
	const ref = useRef<HTMLDivElement>(null)
	const saveShapesRef = useRef(saveShapes)

	const updateContentEditable = (e: React.ChangeEvent<HTMLDivElement>) => {
		updateValue(convertDivContentToStringArray(e.target.innerHTML))
	}

	useEffect(() => {
		if (!ref.current) return
		const currentNode = ref.current

		const handlePaste = (e: ClipboardEvent) => {
			e.preventDefault()
			const text = e.clipboardData?.getData('text/plain')
			document.execCommand('insertText', false, text) //TODO use Clipboard API when ready
		}

		currentNode.addEventListener('paste', handlePaste)
		currentNode.innerHTML = convertStringArrayToDivContent(defaultValue)
		currentNode.focus()

		return () => {
			currentNode.removeEventListener('paste', handlePaste)
		}
	}, [defaultValue])

	useEffect(() => {
		const saveText = saveShapesRef.current
		return () => {
			saveText()
		}
	}, [])

	const position = useMemo(() => {
		const { borders, center } = getShapeInfos(shape, selectionPadding)

		return rotatePoint({
			point: [borders.x, borders.y],
			rotation: -shape.rotation,
			origin: center
		})
	}, [shape, selectionPadding])

	return (
		<div
			className='react-paint-editor-toolbox-edittextbox'
			ref={ref}
			data-fontbold={shape.style?.fontBold ?? false}
			data-fontitalic={shape.style?.fontItalic ?? false}
			contentEditable={!disabled}
			onInput={updateContentEditable}
			style={{
				'--react-paint-editor-toolbox-edittextbox-transform': `translate3D(${position[0] * scaleRatio}px, ${
					position[1] * scaleRatio
				}px, 0) rotate(${radiansToDegrees(shape.rotation)}deg)`,
				'--react-paint-editor-toolbox-edittextbox-fontsize': `${shape.fontSize * scaleRatio}px`,
				'--react-paint-editor-toolbox-edittextbox-padding': `${selectionPadding * scaleRatio}px`,
				'--react-paint-editor-toolbox-edittextbox-color': shape.style?.strokeColor ?? 'inherit',
				'--react-paint-editor-toolbox-edittextbox-opacity': (shape.style?.opacity ?? 100) / 100,
				'--react-paint-editor-toolbox-edittextbox-fontfamily': shape.style?.fontFamily ?? STYLE_FONT_DEFAULT
			}}
		/>
	)
}

export default EditTextBox
