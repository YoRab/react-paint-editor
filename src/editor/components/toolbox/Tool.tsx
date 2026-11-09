import type { ToolsType } from '@canvas/index'
import Button from '@editor/components/common/Button'
import { getShortcutProps } from '@editor/components/common/ShortcutHint'
import { TOOL_SHORTCUTS } from '@editor/constants/shortcuts'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import { getToolLabel } from '@editor/utils/style'
import type { ReactNode } from 'react'

type ToolComponentType = {
  type: ToolsType
  img?: ReactNode
  withText?: boolean
  isActive: boolean
  disabled?: boolean
  setActive: (marker: ToolsType) => void
}

const Tool = ({ type, img, isActive, withText = false, disabled = false, setActive }: ToolComponentType) => {
  const locale = useEditorLocale()
  const label = getToolLabel(type, locale.editor)
  const handleClick = () => {
    setActive(type)
  }

  return (
    <Button
      disabled={disabled}
      pressed={isActive}
      onClick={handleClick}
      {...getShortcutProps(label, TOOL_SHORTCUTS[type.id], locale)}
      icon={img}
      data-testid={`tool-${type.type}`}
    >
      {withText ? label : undefined}
    </Button>
  )
}

export default Tool
