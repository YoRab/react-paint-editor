import type { UtilsSettings } from '@canvas/constants/app'
import { STYLE_FONT_DEFAULT } from '@canvas/constants/rendering'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { getTextLineHeight, getTextPaints, TEXT_DECORATION_THICKNESS } from '@canvas/utils/shapes/text'
import { radiansToDegrees, rotatePoint } from '@canvas/utils/trigo'
import { cssVar } from '@canvas/utils/util'
import type React from 'react'
import { type CSSProperties, useEffect, useMemo, useRef } from 'react'

const EDIT_TEXT_BOX_STYLE: CSSProperties = {
  position: 'absolute',
  outline: 'none',
  left: 0,
  top: 0,
  transformOrigin: 'left top',
  boxSizing: 'border-box',
  width: 'max-content',
  // the outline of the letters is painted under them, like on the canvas. The lines under and through them are as thick as
  // on the canvas, at the positions given by the font, and they cross the letters like on the canvas
  paintOrder: 'stroke fill',
  textDecorationSkipInk: 'none',
  textDecorationThickness: `${TEXT_DECORATION_THICKNESS}em`
}

const getNodeValue = (node: ChildNode): string => {
  return node.childNodes.length
    ? Array.from(node.childNodes)
        .map(childNode => getNodeValue(childNode))
        .join('')
    : (node.nodeValue ?? '')
}

type EditTextBoxType = {
  disabled?: boolean
  shape: ShapeEntity<'text'>
  defaultValue: string[]
  settings: UtilsSettings
  updateValue: (newValue: string[]) => void
  saveShapes: () => void
}

const EditTextBox = ({ disabled = false, shape, defaultValue, updateValue, saveShapes, settings }: EditTextBoxType) => {
  const ref = useRef<HTMLDivElement>(null)
  const saveShapesRef = useRef(saveShapes)

  const updateContentEditable = (e: React.InputEvent<HTMLDivElement>) => {
    const divContent = Array.from((e.target as HTMLDivElement).childNodes).map(node => getNodeValue(node))
    updateValue(divContent)
  }

  useEffect(() => {
    if (!ref.current) return
    const currentNode = ref.current

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain')
      if (!text) return
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      selection.deleteFromDocument()
      const range = selection.getRangeAt(0)
      range.insertNode(document.createTextNode(text))
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
      currentNode.dispatchEvent(new Event('input', { bubbles: true }))
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
    const { borders, center } = shape.computed

    return rotatePoint({
      point: [borders.x, borders.y],
      rotation: -(shape.rotation ?? 0),
      origin: center
    })
  }, [shape])

  const { scaleRatio } = settings.canvasSize
  const transform = [
    `translate3D(${(position[0] + settings.canvasOffset[0]) * scaleRatio}px, ${(position[1] + settings.canvasOffset[1]) * scaleRatio}px, 0)`,
    `rotate(${radiansToDegrees(shape.rotation ?? 0)}deg)`,
    shape.flipX || shape.flipY ? `scale(${shape.flipX ? -1 : 1}, ${shape.flipY ? -1 : 1})` : undefined,
    shape.flipX || shape.flipY ? `translate3D(${shape.flipX ? -100 : 0}%,${shape.flipY ? -100 : 0}%,0)` : undefined
  ]
    .filter(Boolean)
    .join(' ')

  const isEditable = !disabled
  const color = cssVar('--react-paint-canvas-edittextbox-color', shape.style?.strokeColor)
  // the same paints as on the canvas
  const { background, outlineWidth, underline, strikethrough } = getTextPaints(shape)
  const textDecorationLine = [underline && 'underline', strikethrough && 'line-through'].filter(Boolean).join(' ')

  return (
    // biome-ignore lint/a11y/useSemanticElements: contentEditable div is used to allow bounding box to fit content
    <div
      className='react-paint-canvas-edittextbox'
      ref={ref}
      aria-label='Text content'
      contentEditable={isEditable}
      role='textbox'
      tabIndex={isEditable ? 0 : undefined}
      onInput={updateContentEditable}
      style={{
        ...EDIT_TEXT_BOX_STYLE,
        transform: cssVar('--react-paint-canvas-edittextbox-transform', transform),
        fontSize: cssVar('--react-paint-canvas-edittextbox-fontsize', `${shape.fontSize * scaleRatio}px`),
        padding: cssVar('--react-paint-canvas-edittextbox-padding', `${settings.selectionPadding * scaleRatio}px`),
        color,
        opacity: cssVar('--react-paint-canvas-edittextbox-opacity', (shape.style?.opacity ?? 100) / 100),
        fontFamily: cssVar('--react-paint-canvas-edittextbox-fontfamily', shape.style?.fontFamily ?? STYLE_FONT_DEFAULT),
        fontWeight: shape.style?.fontBold ? 'bold' : undefined,
        fontStyle: shape.style?.fontItalic ? 'italic' : undefined,
        textAlign: shape.style?.textAlign,
        // the canvas places the letters in their lines like CSS
        lineHeight: getTextLineHeight(shape.style),
        // the background fills the box with its padding, like the selection frame on the canvas. A background is required to
        // override the one injected in the contenteditable span elements
        background: background ? shape.style?.fillColor : 'none',
        WebkitTextStroke: outlineWidth > 0 ? `${outlineWidth * 2 * scaleRatio}px ${shape.style?.outlineColor}` : undefined,
        textDecorationLine: textDecorationLine || undefined,
        // without it, the lines would take the color of the outline of the letters
        textDecorationColor: color
      }}
    />
  )
}

export default EditTextBox
