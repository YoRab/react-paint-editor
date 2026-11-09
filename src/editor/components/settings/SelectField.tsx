import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import useArrowNavigation from '@editor/hooks/useArrowNavigation'
import useSettingsPanel from '@editor/hooks/useSettingsPanel'
import type React from 'react'
import './SelectField.css'

type SelectFieldType = {
  CustomOption: React.FC<{
    children?: React.ReactNode
  }>
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title: string
  disabled?: boolean
  icon: React.ReactNode
  field: string
  values: (string | number)[]
  /** Names of the values drawn by the option, given to their buttons: a value without a name is named after itself */
  optionLabels?: Record<string, string> | undefined
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const SelectField = ({
  CustomOption,
  selectedSettings,
  setSelectedSettings,
  title,
  disabled = false,
  field,
  icon,
  values,
  optionLabels,
  defaultValue,
  valueChanged
}: SelectFieldType) => {
  const { isPanelVisible, triggerProps, panelProps } = useSettingsPanel(selectedSettings, setSelectedSettings)
  const optionsRef = useArrowNavigation()

  const handleClick = (value: string | number) => {
    valueChanged(field, value)
  }

  if (!values.length) return null

  return (
    <>
      <Button title={title} icon={icon} disabled={disabled} {...triggerProps} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' fitContainer position='bottom' {...panelProps}>
          <div className='react-paint-editor-selectfield-wrapper' ref={optionsRef}>
            {values.map(value => {
              return (
                <Button
                  key={value}
                  title={optionLabels?.[`${value}`] ?? `${value}`}
                  onClick={() => handleClick(value)}
                  pressed={defaultValue === value}
                  style={{
                    '--react-paint-editor-button-padding': '16px'
                  }}
                >
                  <CustomOption>{value}</CustomOption>
                </Button>
              )
            })}
          </div>
        </Panel>
      )}
    </>
  )
}

export default SelectField
