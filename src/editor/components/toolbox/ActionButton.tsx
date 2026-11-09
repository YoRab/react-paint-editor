import Button from '@editor/components/common/Button'
import { getShortcutProps, ShortcutLabel } from '@editor/components/common/ShortcutHint'
import { ACTION_SHORTCUTS } from '@editor/constants/shortcuts'
import useEditorLocale from '@editor/hooks/useEditorLocale'
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
  const locale = useEditorLocale()
  const label = locale.editor.actions[type.type]

  return (
    <Button
      disabled={disabled}
      onClick={handleClick}
      {...getShortcutProps(label, shortcut, locale)}
      icon={type.icon}
      role={role}
      data-testid={`tool-${type.type}`}
    >
      {withText ? <ShortcutLabel label={label} shortcut={shortcut} /> : undefined}
    </Button>
  )
}

export default ActionButton
