import Button from '@editor/components/common/Button'
import { ShortcutLabel, useShortcutProps } from '@editor/components/common/ShortcutHint'
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
  const label = useEditorLocale().editor.actions[type.type]
  const shortcutProps = useShortcutProps(label, shortcut)

  return (
    <Button disabled={disabled} onClick={handleClick} {...shortcutProps} icon={type.icon} role={role} data-testid={`tool-${type.type}`}>
      {withText ? <ShortcutLabel label={label} shortcut={shortcut} /> : undefined}
    </Button>
  )
}

export default ActionButton
