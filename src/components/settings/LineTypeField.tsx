import React from 'react'
import SelectField from './SelectField'
import { STYLE_LINE_DASH } from 'constants/style'
import { styled } from '@linaria/react'

const StyledLine = styled.span`
  display: inline-block;
  width: 6px;
  height: 2px;
  background: transparent;
  vertical-align: middle;
`

const StyledOption = styled.span`
  display: inline-block;

  &[data-type='0'] {
    ${StyledLine} {
      background: black;
    }
  }

  &[data-type='1'] {
    position: relative;
    left: 3px;
    ${StyledLine}:nth-child(3n-1) {
      background: black;
      width: 12px;
    }
    ${StyledLine}:nth-child(n+11) {
      display: none;
    }
  }

  &[data-type='2'] {
    ${StyledLine}:nth-child(2n+1) {
      background: black;
    }
  }
`

type LineTypeOptionType = {
  children: string
}

export const LineTypeOption = ({ children }: LineTypeOptionType) => {
  return (
    <StyledOption data-type={children}>
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
      <StyledLine />
    </StyledOption>
  )
}

type LineTypeType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const LineTypeField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  defaultValue,
  valueChanged
}: LineTypeType) => {
  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={LineTypeOption as React.FC}
      title="Type de traits"
      disabled={disabled}
      field="style.lineDash"
      values={STYLE_LINE_DASH}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default LineTypeField
