import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from './Panel'

type ShapeStyleColorType = {
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
  const [isPanelVisible, setIsPanelVisible] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = _.toNumber(event.target.value)
    valueChanged(field, _.isNaN(parsedValue) ? event.target.value : parsedValue)
  }

  return (
    <>
      <Button
        selected={isPanelVisible}
        disabled={disabled}
        onClick={() => setIsPanelVisible(prev => !prev)}>
        <span>
          {roundValue}
          {unity}
        </span>
      </Button>
      {isPanelVisible && (
        <Panel onClose={() => setIsPanelVisible(false)}>
          <>
            <div>{title}</div>
            <div>
              <label>
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
              </label>
            </div>
          </>
        </Panel>
      )}
    </>
  )
}

export default RangeField
