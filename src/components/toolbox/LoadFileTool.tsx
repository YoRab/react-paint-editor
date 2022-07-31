import React, { useRef } from 'react'
import Button from 'components/common/Button'
import type { ToolsType } from 'types/tools'

type LoadFileToolType = {
  disabled?: boolean
  loadFile: (file: File) => void
  type: ToolsType
  img?: string
  accept: string
  withText?: boolean
}

const LoadFileTool = ({
  disabled = false,
  withText = false,
  loadFile,
  type,
  img,
  accept
}: LoadFileToolType) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLInputElement | HTMLButtonElement>) => {
    event.stopPropagation()
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0)
    if (!file) return
    loadFile(file)
  }

  return (
    <Button
      ref={inputRef}
      type="file"
      onClick={handleClick}
      onChange={handleChange}
      accept={accept}
      title={type.label ?? type.type}
      icon={img}
      children={withText ? type.label : undefined}
      disabled={disabled}
    />
  )
}

export default LoadFileTool
