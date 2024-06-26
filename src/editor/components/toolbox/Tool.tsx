import type { ToolsType } from '@common/types/tools'
import Button from '@editor/components/common/Button'
import React from 'react'

type ToolComponentType = {
  type: ToolsType
  img?: string
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
    <Button disabled={disabled} selected={isActive} onClick={handleClick} title={type.label ?? type.type} icon={img}>
      {withText ? type.label : undefined}
    </Button>
  )
}

export default Tool
