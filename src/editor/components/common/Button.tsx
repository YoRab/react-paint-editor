import React, { useImperativeHandle, useRef } from 'react'
import './Button.css'

type CommonType = {
  hidden?: boolean | undefined
  disabled?: boolean | undefined
  /** Shown as selected, like the button of an open panel */
  selected?: boolean | undefined
  /** Shown as selected, and pressed for the assistive technologies: the button of a value chosen, or of a mode on */
  pressed?: boolean | undefined
  icon?: React.ReactNode
}

type ButtonType = CommonType & React.ButtonHTMLAttributes<HTMLButtonElement>

type FileInputType = CommonType & {
  type: 'file' | 'color'
  accept?: string
  onClick?: React.MouseEventHandler<HTMLElement>
} & React.InputHTMLAttributes<HTMLInputElement | HTMLButtonElement>

const ButtonElement = React.forwardRef<HTMLButtonElement, ButtonType>(
  ({ hidden = false, disabled = false, selected = false, pressed, icon, children, type = 'button', className = '', ...buttonProps }, ref) => (
    <button
      className={`react-paint-editor-button ${className}`}
      ref={ref}
      disabled={disabled}
      data-disabled={+disabled}
      data-selected={+(pressed ?? selected)}
      aria-pressed={pressed}
      data-hidden={+hidden}
      // the title of a button without text is shown while it has the focus of the keyboard, see the tooltip of Button.css
      data-tooltip={children ? undefined : buttonProps.title}
      type={type}
      {...buttonProps}
    >
      <span className='react-paint-editor-button-content'>
        {children && <span className='react-paint-editor-button-children'>{children}</span>}
        {icon && (
          <span className='react-paint-editor-button-icon' aria-hidden='true'>
            {icon}
          </span>
        )}
      </span>
    </button>
  )
)

/**
 * A button opening the picker of a file or of a color input, which it holds: the button takes the focus, the keys and the
 * other props, the input stays out of the keyboard and of the assistive technologies. The ref is the one of the input
 */
const FileInput = React.forwardRef<HTMLInputElement, FileInputType>(
  ({ type, accept, multiple, value, onChange, onClick, disabled, ...buttonProps }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null)

    useImperativeHandle(ref, () => inputRef.current!)

    const openPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      inputRef.current?.click()
    }

    return (
      <>
        <ButtonElement {...(buttonProps as ButtonType)} disabled={disabled} onClick={openPicker} />
        <input
          ref={inputRef}
          className='react-paint-editor-fileinput'
          type={type}
          accept={accept}
          multiple={multiple}
          value={value}
          onChange={onChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden='true'
        />
      </>
    )
  }
)

const Button = React.forwardRef<HTMLButtonElement | HTMLInputElement, ButtonType | FileInputType>((props, ref) =>
  props.type === 'file' || props.type === 'color' ? (
    <FileInput {...props} ref={ref as React.ForwardedRef<HTMLInputElement>} />
  ) : (
    <ButtonElement {...(props as ButtonType)} ref={ref as React.ForwardedRef<HTMLButtonElement>} />
  )
)

export default Button
