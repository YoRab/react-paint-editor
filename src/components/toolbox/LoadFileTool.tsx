import React, { useRef } from 'react'
import Button from 'components/common/Button'

type LoadFileToolType = {
  disabled?: boolean
  loadFile: (file: File) => void
  lib: string
  img?: string
  accept: string
  withText?: boolean
}

const LoadFileTool = ({
  disabled = false,
  withText = false,
  loadFile,
  lib,
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
      title={lib}
      icon={img}
      children={withText ? lib : undefined}
      disabled={disabled}
    />
  )
}

export default LoadFileTool