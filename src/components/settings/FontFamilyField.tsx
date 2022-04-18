import React from 'react'
import SelectField from './SelectField'
import { STYLE_FONTS } from 'constants/style'
import { styled } from '@linaria/react'

const StyledOption = styled.span<{
  family: string
}>`
  font-family: ${({ family }) => family};
`

const FontFamilyOption: React.FC = ({ children }) => {
  return <StyledOption family={children as string}>{children}</StyledOption>
}

type FontFamilyFieldType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const FontFamilyField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  defaultValue,
  valueChanged
}: FontFamilyFieldType) => {
  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={FontFamilyOption}
      title="Font"
      disabled={disabled}
      field="style.fontFamily"
      values={STYLE_FONTS}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default FontFamilyField
