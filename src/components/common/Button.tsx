import React from 'react'
import { styled } from '@linaria/react'

const StyledButton = styled.button`
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  vertical-align: middle;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-color);

  &[data-selected='1'] {
    color: var(--text-color-selected);
    background: var(--bg-color-selected);
  }

  &[data-hidden='1'] {
    visibility: hidden;
  }

  &[data-disabled='1'] {
    opacity: 0.25;
    cursor: default;
  }

  &[data-selected='0'][data-disabled='0'] {
    &:hover {
      background: var(--btn-hover);
    }
  }

  &[data-disabled='0'] {
    cursor: pointer;
  }

  svg {
    color: inherit;
    width: 16px;
    height: 16px;
  }

  input {
    position: absolute;
    visibility: hidden;
  }
`

type CommonType = {
  hidden?: boolean
  disabled?: boolean
  selected?: boolean
}

type ButtonType = CommonType & React.ButtonHTMLAttributes<HTMLButtonElement>

type FileInputType = CommonType & {
  type: 'file' | 'color'
  accept?: string
} & React.InputHTMLAttributes<HTMLInputElement>

const Button = React.forwardRef<HTMLButtonElement | HTMLInputElement, ButtonType | FileInputType>(
  (props, ref) => {
    if (props.type === 'file' || props.type === 'color') {
      const {
        hidden = false,
        disabled = false,
        selected = false,
        children,
        className,
        ...fileProps
      } = props
      return (
        <StyledButton
          as="label"
          className={className}
          data-disabled={+disabled}
          data-selected={+selected}
          data-hidden={+hidden}>
          <input
            ref={ref as React.ForwardedRef<HTMLInputElement>}
            disabled={disabled}
            {...fileProps}
          />
          {children}
        </StyledButton>
      )
    } else {
      const {
        hidden = false,
        disabled = false,
        selected = false,
        children,
        ...fileProps
      } = props as ButtonType

      return (
        <StyledButton
          ref={ref as React.ForwardedRef<HTMLButtonElement>}
          disabled={disabled}
          data-disabled={+disabled}
          data-selected={+selected}
          data-hidden={+hidden}
          {...fileProps}>
          {children}
        </StyledButton>
      )
    }
  }
)

export default Button
