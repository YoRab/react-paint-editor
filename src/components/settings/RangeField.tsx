import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from './Panel'

const StyledLabel = styled.label`
  display: inline-flex;
  align-items: center;
`

type ShapeStyleColorType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean
  field: string
  min?: number
  max?: number
  step?: number
  unity?: string
  value?: number | undefined
  valueChanged: (field: string, value: string | number) => void
}

const RangeField = ({
  selectedSettings,
  setSelectedSettings,
  title = "Choisissez l'intervalle",
  disabled = false,
  field,
  value = 1,
  min = 1,
  max = 10,
  step = 1,
  unity = '',
  valueChanged
}: ShapeStyleColorType) => {
  const roundValue = Math.round(value)
  const [customKey] = useState(_.uniqueId('settings_'))

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = _.toNumber(event.target.value)
    valueChanged(field, _.isNaN(parsedValue) ? event.target.value : parsedValue)
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
        <span>
          {roundValue}
          {unity}
        </span>
      </Button>
      {isPanelVisible && (
        <Panel title={title}>
          <div>
            <StyledLabel>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
              />
              <span>
                {roundValue}
                {unity}
              </span>
            </StyledLabel>
          </div>
        </Panel>
      )}
    </>
  )
}

export default RangeField
