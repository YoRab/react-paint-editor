import Button from '@editor/components/common/Button'
import { trashIcon } from '@editor/constants/icons'
import useEditorLocale from '@editor/hooks/useEditorLocale'

type DeleteShapeButtonType = {
  disabled?: boolean
  selectedShapeIds: string[]
  removeShapes: (ids: string[]) => void
}

const DeleteButton = ({ disabled = false, selectedShapeIds, removeShapes }: DeleteShapeButtonType) => {
  const { editor } = useEditorLocale()
  const handleRemove = () => {
    removeShapes(selectedShapeIds)
  }

  return <Button title={editor.settings.removeShapes} disabled={disabled} data-disabled={+disabled} onClick={handleRemove} icon={trashIcon} />
}

export default DeleteButton
