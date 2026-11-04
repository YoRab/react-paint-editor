import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import useDebounce from '@editor/hooks/useDebounce'
import useSettingsPanel from '@editor/hooks/useSettingsPanel'
import type React from 'react'
import './RangeField.css'

export type RangeFieldType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean | undefined
  field: string
  icon: React.ReactNode
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  unity?: string
  value?: number | undefined
  saveShapes: () => void
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
  valueChanged,
  saveShapes
}: RangeFieldType) => {
  const indeterminate = value === undefined
  // the value is shown with the decimals of the step
  const decimals = String(step).split('.')[1]?.length ?? 0
  const displayedValue = indeterminate ? 'N/A' : `${+value.toFixed(decimals)}${unity}`
  const { isPanelVisible, triggerProps, panelProps } = useSettingsPanel(selectedSettings, setSelectedSettings)
  const debouncedSaveChanged = useDebounce(saveShapes, 500, true)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = +event.target.value
    const updatedValue = Number.isNaN(parsedValue) ? event.target.value : parsedValue
    valueChanged(field, updatedValue, false)
    debouncedSaveChanged()
  }

  if (min === max) return null

  return (
    <>
      <Button title={title} disabled={disabled} icon={icon} {...triggerProps} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' fitContainer position='bottom' {...panelProps}>
          <div>
            <label className='react-paint-editor-rangefield'>
              <input
                type='range'
                aria-label={title}
                // the shapes selected have different values: the slider shows the middle of the range
                aria-valuetext={indeterminate ? 'Valeurs différentes' : displayedValue}
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
