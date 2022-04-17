import React from 'react'
import { styled } from '@linaria/react'

const StyledButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-color);

  &[data-hidden='1'] {
    visibility: hidden;
  }

  &[data-disabled='1'] {
    opacity: 0.25;
    cursor: default;
  }

  &[data-disabled='0'] {
    cursor: pointer;
    &:hover {
      background: var(--btn-hover);
    }
  }
`

type ButtonType = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  hidden?: boolean
  disabled?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonType>(
  ({ hidden, disabled, ...props }, ref) => {
    return (
      <StyledButton
        ref={ref}
        disabled={disabled}
        data-disabled={+!!disabled}
        data-hidden={+!!hidden}
        {...props}
      />
    )
  }
)

export default Button
