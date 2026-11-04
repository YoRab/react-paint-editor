import Button from '@editor/components/common/Button'
import { getShortcutProps, ShortcutLabel } from '@editor/components/common/ShortcutHint'
import { ACTION_SHORTCUTS } from '@editor/constants/shortcuts'
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
      {...getShortcutProps(type.label, shortcut)}
      icon={type.icon}
      disabled={disabled}
      role={role}
    >
      {withText ? <ShortcutLabel label={type.label} shortcut={shortcut} /> : undefined}
    </Button>
  )
}

export default LoadFileTool
