import { fontIcon } from '@editor/constants/icons'
import type React from 'react'
import './FontFamilyField.css'
import SelectField from './SelectField'

const FontFamilyOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <span
      className='react-paint-editor-fontfamily-option'
      style={{
        '--react-paint-editor-fontfamily-family': children as string
      }}
    >
      {children}
    </span>
  )
}

type FontFamilyFieldType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  values: string[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const FontFamilyField = ({ selectedSettings, setSelectedSettings, disabled = false, values, defaultValue, valueChanged }: FontFamilyFieldType) => {
  if (!values.length) return null

  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={FontFamilyOption}
      title='Police'
      icon={fontIcon}
      disabled={disabled}
      field='fontFamily'
      values={values}
      defaultValue={defaultValue}
      valueChanged={valueChanged}
    />
  )
}

export default FontFamilyField
