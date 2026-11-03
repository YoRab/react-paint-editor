import Button from '@editor/components/common/Button'
import NumberInput from '@editor/components/common/NumberInput'
import Panel from '@editor/components/common/Panel'
import type { RangeFieldType } from '@editor/components/settings/RangeField'
import useDebounce from '@editor/hooks/useDebounce'
import useSettingsPanel from '@editor/hooks/useSettingsPanel'
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
  const { isPanelVisible, triggerProps, panelProps } = useSettingsPanel(selectedSettings, setSelectedSettings)
  const debouncedSaveChanged = useDebounce(saveShapes, 500, true)

  const handleValueChange = (typedValue: number) => {
    valueChanged(field, typedValue, false)
    debouncedSaveChanged()
  }

  return (
    <>
      <Button title={title} disabled={disabled} icon={icon} {...triggerProps} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' fitContainer position='bottom' {...panelProps}>
          <div>
            <label className='react-paint-editor-numberfield'>
              <NumberInput
                aria-label={title}
                min={min}
                max={max}
                step={step}
                value={value}
                placeholder={value === undefined ? 'N/A' : undefined}
                disabled={disabled}
                onValueChange={handleValueChange}
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
