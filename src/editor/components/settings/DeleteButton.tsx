import Button from '@editor/components/common/Button'
import { trashIcon } from '@editor/constants/icons'

type DeleteShapeButtonType = {
  disabled?: boolean
  selectedShapeIds: string[]
  removeShapes: (ids: string[]) => void
}

const DeleteButton = ({ disabled = false, selectedShapeIds, removeShapes }: DeleteShapeButtonType) => {
  const handleRemove = () => {
    removeShapes(selectedShapeIds)
  }

  return <Button title='Delete' disabled={disabled} data-disabled={+disabled} onClick={handleRemove} icon={trashIcon} />
}

export default DeleteButton
