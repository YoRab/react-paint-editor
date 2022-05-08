import _ from 'lodash/fp'
import React, { useState } from 'react'
import Button from 'components/common/Button'
import Panel from './Panel'
import { styled } from '@linaria/react'

const StyledButton = styled(Button)`
  padding: 16px;
`

type ShapeStyleSelectType<T> = {
  CustomOption: React.FC<T>
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean
  field: string
  values: (string | number)[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const SelectField = ({
  CustomOption,
  selectedSettings,
  setSelectedSettings,
  title = "Choisissez l'option",
  disabled = false,
  field,
  values,
  defaultValue,
  valueChanged
}: ShapeStyleSelectType<unknown>) => {
  const [customKey] = useState(_.uniqueId('settings_'))

  const handleClick = (value: string | number) => {
    valueChanged(field, value)
  }

  const togglePanel = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
  }

  const isPanelVisible = selectedSettings === customKey

  return (
    <>
      <Button selected={isPanelVisible} title={title} disabled={disabled} onClick={togglePanel}>
        <CustomOption>{defaultValue}</CustomOption>
      </Button>
      {isPanelVisible && (
        <Panel title={title}>
          <div>
            {values.map(value => {
              return (
                <StyledButton
                  key={value}
                  title={`${value}`}
                  onClick={() => handleClick(value)}
                  selected={defaultValue == value}>
                  <CustomOption>{value}</CustomOption>
                </StyledButton>
              )
            })}
          </div>
        </Panel>
      )}
    </>
  )
}

export default SelectField