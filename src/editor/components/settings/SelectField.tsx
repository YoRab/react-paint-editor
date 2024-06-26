import { uniqueId } from '@common/utils/util'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import type React from 'react'
import { useState } from 'react'
import './SelectField.css'

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
  const [customKey] = useState(uniqueId('settings_'))

  const handleClick = (value: string | number) => {
    valueChanged(field, value)
  }

  const togglePanel = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
  }

  const isPanelVisible = selectedSettings === customKey

  if (!values.length) return null

  return (
    <>
      <Button selected={isPanelVisible} title={title} icon={icon} disabled={disabled} onClick={togglePanel} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' fitContainer={true}>
          <div className='react-paint-editor-selectfield-wrapper'>
            {values.map(value => {
              return (
                <Button
                  key={value}
                  title={`${value}`}
                  onClick={() => handleClick(value)}
                  selected={defaultValue === value}
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
