import React from 'react'
import SelectField from './SelectField'
import { lineEndIcon } from '../../constants/icons'
import './LineArrowField.css'

const LineArrowOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <span className='react-paint-editor-linearrow-option' data-type={children}>
      <span className='react-paint-editor-linearrow-left' />
      <span className='react-paint-editor-linearrow-right' />
    </span>
  )
}

type LineArrowType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  values: number[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const LineArrowField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  values,
  defaultValue,
  valueChanged
}: LineArrowType) => {
  if (!values.length) return null

  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={LineArrowOption}
      title="Flèches"
      icon={lineEndIcon}
      disabled={disabled}
      field="lineArrow"
      values={values}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default LineArrowField
