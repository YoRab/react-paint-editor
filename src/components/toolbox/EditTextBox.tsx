import { STYLE_FONT_DEFAULT } from 'constants/style'
import React, { useEffect, useMemo, useRef } from 'react'
import { styled } from '@linaria/react'
import { DrawableText } from 'types/Shapes'
import { getPointPositionBeforeCanvasTransformation } from 'utils/intersect'
import { getShapeInfos } from 'utils/shapeData'
import { convertDivContentToStringArray, convertStringArrayToDivContent } from 'utils/string'
import { radiansToDegrees } from 'utils/transform'

const StyledEditBox = styled.div<{
  transform: string
  fontsize: number
  fontfamily: string
  color: string
}>`
  position: absolute;
  display: inline-block;
  outline: none;
  left: 0px;
  top: 0px;
  transform-origin: left top;
  transform: ${({ transform }) => transform};
  color: ${({ color }) => color};
  font-size: ${({ fontsize }) => fontsize}px;
  line-height: ${({ fontsize }) => fontsize}px;
  font-family: ${({ fontfamily }) => fontfamily};
`

type EditTextBoxType = {
  scaleRatio: number
  disabled?: boolean
  shape: DrawableText
  defaultValue: string[]
  updateValue: (newValue: string[]) => void
}

const EditTextBox = ({
  disabled = false,
  scaleRatio,
  shape,
  defaultValue,
  updateValue
}: EditTextBoxType) => {
  const ref = useRef<HTMLDivElement>(null)

  const updateContentEditable = (e: React.ChangeEvent<HTMLDivElement>) => {
    updateValue(convertDivContentToStringArray(e.target.innerHTML))
  }

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = convertStringArrayToDivContent(defaultValue)
    ref.current.focus()
  }, [defaultValue])

  const position = useMemo(() => {
    const { borders, center } = getShapeInfos(shape)

    return getPointPositionBeforeCanvasTransformation(
      [borders.x, borders.y],
      [-shape.translation[0], -shape.translation[1]],
      shape.rotation,
      center
    )
  }, [shape])

  return (
    <StyledEditBox
      ref={ref}
      transform={`translate3D(${position[0] * scaleRatio}px, ${
        position[1] * scaleRatio
      }px, 0) rotate(${radiansToDegrees(shape.rotation)}deg)`}
      fontsize={shape.fontSize * scaleRatio}
      color={shape.style?.strokeColor ?? 'inherit'}
      fontfamily={shape.style?.fontFamily ?? STYLE_FONT_DEFAULT}
      contentEditable={!disabled}
      onInput={updateContentEditable}></StyledEditBox>
  )
}

export default EditTextBox
