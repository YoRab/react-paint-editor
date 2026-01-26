import React, { useImperativeHandle, useRef } from 'react'
import './Button.css'
import { KeyboardCode } from '@canvas/constants/keyboard'
import type { FileInputType } from '@editor/components/common/Button'

const FileInput = React.forwardRef<HTMLButtonElement | HTMLInputElement, FileInputType>((props, ref) => {
  const { hidden = false, disabled = false, selected = false, icon, children, className = '', title, onClick, ...fileProps } = props
  const tabIndex = disabled ? -1 : 0
  const inputRef = useRef<HTMLInputElement | null>(null)

  useImperativeHandle(ref, () => inputRef.current!)

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === KeyboardCode.Space) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const onKeyUp = (e: React.KeyboardEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === KeyboardCode.Space) {
      inputRef.current?.click()
    }
  }

  return (
    <label
      className={`react-paint-editor-button ${className}`}
      title={title}
      onClick={onClick}
      data-disabled={+disabled}
      data-selected={+selected}
      data-hidden={+hidden}
      tabIndex={tabIndex}
      //   onFocus={onFocus}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <input ref={inputRef} disabled={disabled} {...fileProps} />
      <span className='react-paint-editor-button-content'>
        {children && <span className='react-paint-editor-button-children'>{children}</span>}
        {icon && <span className='react-paint-editor-button-icon' dangerouslySetInnerHTML={{ __html: icon }} />}
      </span>
    </label>
  )
})

export default FileInput
