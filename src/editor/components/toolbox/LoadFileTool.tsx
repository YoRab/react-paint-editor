import Button from '@editor/components/common/Button'
import { ShortcutLabel, useShortcutProps } from '@editor/components/common/ShortcutHint'
import { ACTION_SHORTCUTS } from '@editor/constants/shortcuts'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import type { EditorActionTool } from '@editor/types/tools'
import type React from 'react'
import { useRef } from 'react'

type LoadFileToolType = {
  disabled?: boolean
  loadFile: (file: File) => void
  type: EditorActionTool
  accept: string
  withText?: boolean
  /** An item of a menu: its role is menuitem */
  role?: 'menuitem'
}

const LoadFileTool = ({ disabled = false, withText = false, loadFile, type, accept, role }: LoadFileToolType) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const shortcut = ACTION_SHORTCUTS[type.type]
  const label = useEditorLocale().editor.actions[type.type]
  const shortcutProps = useShortcutProps(label, shortcut)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0)
    if (!file) return
    loadFile(file)
  }

  return (
    <Button
      ref={inputRef}
      type='file'
      onClick={handleClick}
      onChange={handleChange}
      accept={accept}
      {...shortcutProps}
      icon={type.icon}
      disabled={disabled}
      role={role}
    >
      {withText ? <ShortcutLabel label={label} shortcut={shortcut} /> : undefined}
    </Button>
  )
}

export default LoadFileTool
