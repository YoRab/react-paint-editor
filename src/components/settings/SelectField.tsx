import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from './Panel'

const StyledSelect = styled.select`
  // A reset of styles, including removing the default dropdown arrow
  appearance: none;
  // Additional resets for further consistency
  background-color: transparent;
  color: inherit;
  border: none;
  padding: 0 12px 0 0;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;

  option {
    background-color: var(--bg-color);
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

type ShapeStyleSelectType = {
  title?: string
  disabled?: boolean
  field: string
  values: (string | number)[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const SelectField = ({
  title = "Choisissez l'option",
  disabled = false,
  field,
  values,
  defaultValue,
  valueChanged
}: ShapeStyleSelectType) => {
  const [isPanelVisible, setIsPanelVisible] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const parsedValue = _.toNumber(event.target.value)
    valueChanged(field, _.isNaN(parsedValue) ? event.target.value : parsedValue)
  }

  return (
    <>
      <Button
        selected={isPanelVisible}
        disabled={disabled}
        onClick={() => setIsPanelVisible(prev => !prev)}>
        <span>{defaultValue}</span>
      </Button>
      {isPanelVisible && (
        <Panel onClose={() => setIsPanelVisible(false)}>
          <>
            <div>{title}</div>
            <div>
              <StyledSelect onChange={handleChange} disabled={disabled} data-disabled={+disabled}>
                {values.map(value => {
                  return (
                    <option key={value} value={value} selected={defaultValue == value}>
                      {value}
                    </option>
                  )
                })}
              </StyledSelect>
            </div>
          </>
        </Panel>
      )}
    </>
  )
}

export default SelectField
