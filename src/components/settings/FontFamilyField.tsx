import React from 'react'
import SelectField from './SelectField'
import { styled } from '@linaria/react'
import _ from 'lodash/fp'

const StyledOption = styled.span<{
  family: string
}>`
  font-family: ${({ family }) => family};
`

const FontFamilyOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return <StyledOption family={children as string}>{children}</StyledOption>
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

  if(_.isEmpty(values)) return null

  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={FontFamilyOption}
      title="Font"
      disabled={disabled}
      field="fontFamily"
      values={values}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default FontFamilyField
