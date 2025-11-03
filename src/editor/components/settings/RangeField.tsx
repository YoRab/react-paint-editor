import { uniqueId } from '@common/utils/util'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import './RangeField.css'

type ShapeStyleColorType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean | undefined
  field: string
  icon: string
  min?: number
  max?: number
  step?: number
  unity?: string
  value?: number | undefined
  valueChanged: (field: string, value: string | number, needHistorySave?: boolean) => void
}

const RangeField = ({
  selectedSettings,
  setSelectedSettings,
  title = "Choisissez l'intervalle",
  icon,
  disabled = false,
  field,
  value,
  min = 1,
  max = 20,
  step = 1,
  unity = '',
  valueChanged
}: ShapeStyleColorType) => {
  const indeterminate = value === undefined
  const displayedValue = indeterminate ? 'N/A' : `${Math.round(value)}${unity}`
  const [customKey] = useState(uniqueId('settings_'))
  const timeoutCb = useRef<NodeJS.Timeout | null>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = +event.target.value
    valueChanged(field, Number.isNaN(parsedValue) ? event.target.value : parsedValue, false)

    timeoutCb.current && clearTimeout(timeoutCb.current)
    timeoutCb.current = setTimeout(() => {
      valueChanged(field, Number.isNaN(parsedValue) ? event.target.value : parsedValue, true)
    }, 1000)
  }

  const togglePanel = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
  }

  useEffect(() => {
    return () => {
      timeoutCb.current && clearTimeout(timeoutCb.current)
    }
  }, [])

  const isPanelVisible = selectedSettings === customKey

  if (min === max) return null

  return (
    <>
      <Button selected={isPanelVisible} title={title} disabled={disabled} icon={icon} onClick={togglePanel} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' fitContainer={true}>
          <div>
            <label className='react-paint-editor-rangefield'>
              <input
                type='range'
                min={min}
                max={max}
                step={step}
                value={value ?? (max + min) / 2}
                data-indeterminate={+indeterminate}
                onChange={handleChange}
              />
              <span>{displayedValue}</span>
            </label>
          </div>
        </Panel>
      )}
    </>
  )
}

export default RangeField
