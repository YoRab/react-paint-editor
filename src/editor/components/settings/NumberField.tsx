import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import type { RangeFieldType } from '@editor/components/settings/RangeField'
import useDebounce from '@editor/hooks/useDebounce'
import { uniqueId } from '@editor/utils/util'
import type React from 'react'
import { useState } from 'react'
import './NumberField.css'

type NumberFieldType = RangeFieldType & { title: string }

/** A number typed in a field, for a setting without upper limit */
const NumberField = ({
  selectedSettings,
  setSelectedSettings,
  title,
  icon,
  disabled = false,
  field,
  value,
  min,
  max,
  step = 1,
  unity = '',
  valueChanged,
  saveShapes
}: NumberFieldType) => {
  const [customKey] = useState(uniqueId('settings_'))
  // the typed text while the field has the focus: it can be empty or out of the limits for a moment
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const debouncedSaveChanged = useDebounce(saveShapes)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value)
    const typedValue = event.target.valueAsNumber
    if (!Number.isFinite(typedValue) || (min !== undefined && typedValue < min) || (max !== undefined && typedValue > max)) return
    valueChanged(field, typedValue, false)
    debouncedSaveChanged()
  }

  const togglePanel = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
  }

  const isPanelVisible = selectedSettings === customKey

  return (
    <>
      <Button selected={isPanelVisible} title={title} disabled={disabled} icon={icon} onClick={togglePanel} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' fitContainer position='bottom'>
          <div>
            <label className='react-paint-editor-numberfield'>
              <input
                type='number'
                aria-label={title}
                min={min}
                max={max}
                step={step}
                value={draft ?? (value === undefined ? '' : Math.round(value))}
                placeholder={value === undefined ? 'N/A' : undefined}
                disabled={disabled}
                onChange={handleChange}
                onBlur={() => setDraft(undefined)}
              />
              {unity}
            </label>
          </div>
        </Panel>
      )}
    </>
  )
}

export default NumberField
