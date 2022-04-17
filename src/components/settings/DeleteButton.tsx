import React from 'react'
import { styled } from '@linaria/react'
import { trashIcon } from 'constants/icons'
import { DrawableShape } from 'types/Shapes'
import Button from 'components/common/Button'

const StyledDeleteButton = styled(Button)`
  svg {
    color: inherit;
    width: 16px;
    height: 16px;
  }
`

type DeleteShapeButtonType = {
  disabled?: boolean
  selectedShape: DrawableShape
  removeShape: (shape: DrawableShape) => void
}

const DeleteButton = ({ disabled = false, selectedShape, removeShape }: DeleteShapeButtonType) => {
  const handleRemove = () => {
    removeShape(selectedShape)
  }

  return (
    <StyledDeleteButton
      disabled={disabled}
      data-disabled={+disabled}
      onClick={handleRemove}
      dangerouslySetInnerHTML={{ __html: trashIcon }}></StyledDeleteButton>
  )
}

export default DeleteButton
