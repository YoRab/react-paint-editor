import React from 'react'
import Button from '../../components/common/Button'
import type { ToolsType } from '../../types/tools'

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
    <Button
      disabled={disabled}
      selected={isActive}
      onClick={handleClick}
      title={type.label ?? type.type}
      icon={img}
      children={withText ? type.label : undefined}
    />
  )
}

export default Tool
