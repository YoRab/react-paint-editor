import { STYLE_FONT_DEFAULT } from 'constants/style'
import React, { useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { DrawableText, Point } from 'types/Shapes'
import { getPointPositionBeforeCanvasTransformation } from 'utils/intersect'
import { getShapeInfos } from 'utils/shapeData'
import { convertDivContentToStringArray, convertStringArrayToDivContent } from 'utils/string'
import { radiansToDegrees } from 'utils/transform'

const StyledEditBox = styled.div<{
  position: Point
  rotation: number
  fontsize: number
  fontfamily: string
  color: string | undefined
}>`
  position: absolute;
  display: inline-block;
  outline: none;
  left: 0px;
  top: 0px;
  ${({ rotation, position }) => `
    transform-origin: left top;
    transform: translate3D(${position[0]}px, ${position[1]}px, 0) rotate(${rotation}deg);
  `}
  color: ${({ color }) => color};
  font-size: ${({ fontsize }) => fontsize}px;
  line-height: ${({ fontsize }) => fontsize}px;
  font-family: ${({ fontfamily }) => fontfamily};
`

type EditTextBoxType = {
  disabled?: boolean
  shape: DrawableText
  defaultValue: string[]
  updateValue: (newValue: string[]) => void
}

const EditTextBox = ({ disabled = false, shape, defaultValue, updateValue }: EditTextBoxType) => {
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
      position={position}
      rotation={radiansToDegrees(shape.rotation)}
      fontsize={shape.fontSize}
      color={shape.style?.strokeColor}
      fontfamily={shape.style?.fontFamily ?? STYLE_FONT_DEFAULT}
      contentEditable={!disabled}
      onInput={updateContentEditable}></StyledEditBox>
  )
}

export default EditTextBox
