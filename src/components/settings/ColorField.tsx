import _ from 'lodash/fp'
import React from 'react'
import { styled } from '@linaria/react'

const StyledColorInput = styled.input`
  border: none;
  padding: 0;
  margin: 0;
  height: 36px;
  background-color: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
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

type ShapeStyleColorType = {
    disabled?: boolean
    field: string
    defaultValue?: number | string | undefined
    valueChanged: (field: string, value: string | number) => void
  }

const ColorField = ({
    disabled = false,
    field,
    defaultValue,
    valueChanged
  }: ShapeStyleColorType) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsedValue = _.toNumber(event.target.value)
      valueChanged(field, _.isNaN(parsedValue) ? event.target.value : parsedValue)
    }
  
    return (
      <StyledColorInput
        type="color"
        value={defaultValue}
        onChange={handleChange}
        disabled={disabled}
        data-disabled={+disabled}></StyledColorInput>
    )
  }


  export default ColorField