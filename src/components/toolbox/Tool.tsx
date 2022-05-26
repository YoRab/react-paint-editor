import React from 'react'
import Button from 'components/common/Button'
import { ToolsType } from 'types/Shapes'

type ToolType = {
  type: ToolsType
  lib: string
  img?: string
  withText?: boolean
  isActive: boolean
  disabled?: boolean
  setActive: (marker: ToolsType) => void
}

const Tool = ({
  type,
  lib = '',
  img,
  isActive,
  withText = false,
  disabled = false,
  setActive
}: ToolType) => {
  const handleClick = () => {
    setActive(type)
  }

  return (
    <Button
      disabled={disabled}
      selected={isActive}
      onClick={handleClick}
      title={lib}
      dangerouslySetInnerHTML={{ __html: img ? (withText ? lib + img : img) : lib }}></Button>
  )
}

export default Tool
