import React from 'react'
import SelectField from './SelectField'
import { lineTypeIcon } from '../../constants/icons'
import './LineTypeField.css'

type LineTypeOptionType = {
  children: string
}

export const LineTypeOption = ({ children }: LineTypeOptionType) => {
  return (
    <span className='react-paint-editor-linetype-option' data-type={children}>
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

type LineTypeType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  values: number[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const LineTypeField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  values,
  defaultValue,
  valueChanged
}: LineTypeType) => {
  if (!values.length) return null

  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={LineTypeOption as React.FC}
      icon={lineTypeIcon}
      title="Type de traits"
      disabled={disabled}
      field="lineDash"
      values={values}
      defaultValue={defaultValue}
      valueChanged={valueChanged}
    />
  )
}

export default LineTypeField
