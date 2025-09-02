import type { ShapeEntity } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import { trashIcon } from '@editor/constants/icons'

type DeleteShapeButtonType = {
  disabled?: boolean
  selectedShape: ShapeEntity
  removeShape: (shape: ShapeEntity) => void
}

const DeleteButton = ({ disabled = false, selectedShape, removeShape }: DeleteShapeButtonType) => {
  const handleRemove = () => {
    removeShape(selectedShape)
  }

  return <Button title='Delete' disabled={disabled} data-disabled={+disabled} onClick={handleRemove} icon={trashIcon} />
}

export default DeleteButton
