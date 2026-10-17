import Button from '@editor/components/common/Button'
import type { EditorActionTool } from '@editor/types/tools'

type ActionButtonType = {
  type: EditorActionTool
  withText?: boolean
  disabled?: boolean
  onClick: () => void
}

// Button of an action of the editor (undo, export...): unlike a tool, it is never active
const ActionButton = ({ type, withText = false, disabled = false, onClick }: ActionButtonType) => {
  const handleClick = () => {
    onClick()
  }

  return (
    <Button disabled={disabled} onClick={handleClick} title={type.label} icon={type.icon} data-testid={`tool-${type.type}`}>
      {withText ? type.label : undefined}
    </Button>
  )
}

export default ActionButton
