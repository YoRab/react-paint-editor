import _ from 'lodash/fp'
import React, { useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'

const StyledButton = styled(Button)`
  padding: 16px;
`

const StyleWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
`

type SelectFieldType = {
  CustomOption: React.FC<{
    children?: React.ReactNode
  }>
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean
  icon: string
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
  icon,
  values,
  defaultValue,
  valueChanged
}: SelectFieldType) => {
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

  if (_.isEmpty(values)) return null

  return (
    <>
      <Button
        selected={isPanelVisible}
        title={title}
        icon={icon}
        disabled={disabled}
        onClick={togglePanel}
      />
      {isPanelVisible && (
        <Panel title={title} alignment="left" fitContainer={true}>
          <StyleWrapper>
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
          </StyleWrapper>
        </Panel>
      )}
    </>
  )
}

export default SelectField
