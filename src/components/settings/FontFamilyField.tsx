import React, { CSSProperties } from 'react'
import SelectField from './SelectField'
import _ from 'lodash/fp'
import { fontIcon } from 'constants/icons'
import './FontFamilyField.css'

const FontFamilyOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return <span
    className='react-paint-editor-fontfamily-option'
    style={{
      '--react-paint-editor-fontfamily-family': children
    } as CSSProperties}
  >{children}</span>
}

type FontFamilyFieldType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  values: string[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const FontFamilyField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  values,
  defaultValue,
  valueChanged
}: FontFamilyFieldType) => {
  if (_.isEmpty(values)) return null

  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={FontFamilyOption}
      title="Police"
      icon={fontIcon}
      disabled={disabled}
      field="fontFamily"
      values={values}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default FontFamilyField
