import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from './Panel'

type ShapeStyleSelectType = {
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
  selectedSettings,
  setSelectedSettings,
  title = "Choisissez l'option",
  disabled = false,
  field,
  values,
  defaultValue,
  valueChanged
}: ShapeStyleSelectType) => {
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
      <Button selected={isPanelVisible} disabled={disabled} onClick={togglePanel}>
        <span>{defaultValue}</span>
      </Button>
      {isPanelVisible && (
        <Panel>
          <>
            <div>{title}</div>
            <div>
              {values.map(value => {
                return (
                  <Button
                    key={value}
                    onClick={() => handleClick(value)}
                    selected={defaultValue == value}>
                    {value}
                  </Button>
                )
              })}
            </div>
          </>
        </Panel>
      )}
    </>
  )
}

export default SelectField
