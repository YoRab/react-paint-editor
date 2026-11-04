import Button from '@editor/components/common/Button'
import { getShortcutProps, ShortcutLabel } from '@editor/components/common/ShortcutHint'
import { ACTION_SHORTCUTS } from '@editor/constants/shortcuts'
import type { EditorActionTool } from '@editor/types/tools'

type ActionButtonType = {
  type: EditorActionTool
  withText?: boolean
  disabled?: boolean
  /** An item of a menu: its role is menuitem */
  role?: 'menuitem'
  onClick: () => void
}

// Button of an action of the editor (undo, export...): unlike a tool, it is never active
const ActionButton = ({ type, withText = false, disabled = false, role, onClick }: ActionButtonType) => {
  const handleClick = () => {
    onClick()
  }
  const shortcut = ACTION_SHORTCUTS[type.type]

  return (
    <Button
      disabled={disabled}
      onClick={handleClick}
      {...getShortcutProps(type.label, shortcut)}
      icon={type.icon}
      role={role}
      data-testid={`tool-${type.type}`}
    >
      {withText ? <ShortcutLabel label={type.label} shortcut={shortcut} /> : undefined}
    </Button>
  )
}

export default ActionButton
