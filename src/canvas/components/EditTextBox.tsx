import type { UtilsSettings } from '@canvas/constants/app'
import { getShapeInfos } from '@canvas/utils/shapes'
import { radiansToDegrees, rotatePoint } from '@canvas/utils/trigo'
import type { DrawableShape } from '@common/types/Shapes'
import { STYLE_FONT_DEFAULT } from '@editor/constants/style'
import type React from 'react'
import { useEffect, useMemo, useRef } from 'react'
import './EditTextBox.css'

const getNodeValue = (node: ChildNode): string => {
  return node.childNodes.length
    ? Array.from(node.childNodes)
        .map(childNode => getNodeValue(childNode))
        .join('')
    : (node.nodeValue ?? '')
}

type EditTextBoxType = {
  scaleRatio: number
  disabled?: boolean
  shape: DrawableShape<'text'>
  defaultValue: string[]
  settings: UtilsSettings
  updateValue: (newValue: string[]) => void
  saveShapes: () => void
}

const EditTextBox = ({ disabled = false, scaleRatio, shape, defaultValue, updateValue, saveShapes, settings }: EditTextBoxType) => {
  const ref = useRef<HTMLDivElement>(null)
  const saveShapesRef = useRef(saveShapes)

  const updateContentEditable = (e: React.ChangeEvent<HTMLDivElement>) => {
    const divContent = Array.from(e.target.childNodes).map(node => getNodeValue(node))
    updateValue(divContent)
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

    currentNode.innerText = ''
    for (const rowValue of defaultValue) {
      const rowDiv = document.createElement('div')
      if (rowValue === '') {
        rowDiv.innerHTML = '<br/>'
      } else {
        rowDiv.innerText = rowValue
      }
      currentNode.appendChild(rowDiv)
    }
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
    const { borders, center } = getShapeInfos(shape, settings)

    return rotatePoint({
      point: [borders.x, borders.y],
      rotation: -shape.rotation,
      origin: center
    })
  }, [shape, settings])

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
        '--react-paint-editor-toolbox-edittextbox-padding': `${settings.selectionPadding * scaleRatio}px`,
        '--react-paint-editor-toolbox-edittextbox-color': shape.style?.strokeColor ?? 'inherit',
        '--react-paint-editor-toolbox-edittextbox-opacity': (shape.style?.opacity ?? 100) / 100,
        '--react-paint-editor-toolbox-edittextbox-fontfamily': shape.style?.fontFamily ?? STYLE_FONT_DEFAULT
      }}
    />
  )
}

export default EditTextBox
