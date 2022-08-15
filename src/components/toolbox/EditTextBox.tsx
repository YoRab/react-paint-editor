import { STYLE_FONT_DEFAULT } from 'constants/style'
import React, { useEffect, useMemo, useRef } from 'react'
import { styled } from '@linaria/react'
import type { DrawableText } from 'types/Shapes'
import { convertDivContentToStringArray, convertStringArrayToDivContent } from 'utils/string'
import { getShapeInfos } from 'utils/shapes'
import { radiansToDegrees, rotatePoint } from 'utils/trigo'

const StyledEditBox = styled.div<{
  transform: string
  fontsize: number
  fontfamily: string
  color: string
  padding: number
  opacity: number
}>`
  position: absolute;
  display: inline-block;
  outline: none;
  left: 0px;
  top: 0px;
  transform-origin: left top;
  box-sizing: border-box;
  transform: ${({ transform }) => transform};
  color: ${({ color }) => color};
  padding: ${({ padding }) => padding}px;
  font-size: ${({ fontsize }) => fontsize}px;
  line-height: ${({ fontsize }) => fontsize}px;
  font-family: ${({ fontfamily }) => fontfamily};
  opacity: ${({ opacity }) => opacity};
  width: max-content;

  &[data-fontbold='true'] {
    font-weight: bold;
  }

  &[data-fontitalic='true'] {
    font-style: italic;
  }
`

type EditTextBoxType = {
  scaleRatio: number
  disabled?: boolean
  shape: DrawableText
  defaultValue: string[]
  selectionPadding: number
  updateValue: (newValue: string[]) => void
}

const EditTextBox = ({
  disabled = false,
  scaleRatio,
  shape,
  defaultValue,
  updateValue,
  selectionPadding
}: EditTextBoxType) => {
  const ref = useRef<HTMLDivElement>(null)

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

  const position = useMemo(() => {
    const { borders, center } = getShapeInfos(shape, selectionPadding)

    return rotatePoint({
      point: [borders.x, borders.y],
      rotation: shape.rotation,
      origin: center
    })
  }, [shape, selectionPadding])

  return (
    <StyledEditBox
      ref={ref}
      transform={`translate3D(${position[0] * scaleRatio}px, ${
        position[1] * scaleRatio
      }px, 0) rotate(${radiansToDegrees(shape.rotation)}deg)`}
      fontsize={shape.fontSize * scaleRatio}
      padding={selectionPadding * scaleRatio}
      color={shape.style?.strokeColor ?? 'inherit'}
      opacity={(shape.style?.globalAlpha ?? 100) / 100}
      fontfamily={shape.style?.fontFamily ?? STYLE_FONT_DEFAULT}
      data-fontbold={shape.style?.fontBold ?? false}
      data-fontitalic={shape.style?.fontItalic ?? false}
      contentEditable={!disabled}
      onInput={updateContentEditable}
    />
  )
}

export default EditTextBox
