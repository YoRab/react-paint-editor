import React from 'react'
import './Button.css'

type CommonType = {
  hidden?: boolean | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  icon?: string | undefined
}

type ButtonType = CommonType & React.ButtonHTMLAttributes<HTMLButtonElement>

type FileInputType = CommonType & {
  type: 'file' | 'color'
  accept?: string
  onClick?: React.MouseEventHandler<HTMLElement>
} & React.InputHTMLAttributes<HTMLInputElement | HTMLButtonElement>

const Button = React.forwardRef<HTMLButtonElement | HTMLInputElement, ButtonType | FileInputType>((props, ref) => {
  if (props.type === 'file' || props.type === 'color') {
    const { hidden = false, disabled = false, selected = false, icon, children, className = '', title, onClick, ...fileProps } = props
    return (
      <label
        className={`react-paint-editor-button ${className}`}
        title={title}
        onClick={onClick}
        data-disabled={+disabled}
        data-selected={+selected}
        data-hidden={+hidden}
      >
        <input ref={ref as React.ForwardedRef<HTMLInputElement>} disabled={disabled} {...fileProps} />
        <span className='react-paint-editor-button-content'>
          {children && <span className='react-paint-editor-button-children'>{children}</span>}
          {icon && <span className='react-paint-editor-button-icon' dangerouslySetInnerHTML={{ __html: icon }} />}
        </span>
      </label>
    )
  }
  const { hidden = false, disabled = false, selected = false, icon, children, type = 'button', className = '', ...fileProps } = props as ButtonType

  return (
    <button
      className={`react-paint-editor-button ${className}`}
      ref={ref as React.ForwardedRef<HTMLButtonElement>}
      disabled={disabled}
      data-disabled={+disabled}
      data-selected={+selected}
      data-hidden={+hidden}
      type={type}
      {...fileProps}
    >
      <span className='react-paint-editor-button-content'>
        {children && <span className='react-paint-editor-button-children'>{children}</span>}
        {icon && <span className='react-paint-editor-button-icon' dangerouslySetInnerHTML={{ __html: icon }} />}
      </span>
    </button>
  )
})

export default Button
