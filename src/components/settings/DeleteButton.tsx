import React from 'react'
import { trashIcon } from '../../constants/icons'
import type { DrawableShape } from '../../types/Shapes'
import Button from '../../components/common/Button'

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
    <Button
      title="Delete"
      disabled={disabled}
      data-disabled={+disabled}
      onClick={handleRemove}
      icon={trashIcon}
    />
  )
}

export default DeleteButton
