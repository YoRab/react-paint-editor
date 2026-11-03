import type { ToolsType } from '@canvas/index'
import Button from '@editor/components/common/Button'
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
  const handleClick = () => {
    setActive(type)
  }

  return (
    <Button disabled={disabled} pressed={isActive} onClick={handleClick} title={type.label ?? type.type} icon={img} data-testid={`tool-${type.type}`}>
      {withText ? type.label : undefined}
    </Button>
  )
}

export default Tool
