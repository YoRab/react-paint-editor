import React from 'react'
import SelectField from './SelectField'
import { styled } from '@linaria/react'
import _ from 'lodash/fp'

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
      background: currentColor;
    }
  }

  &[data-type='1'] {
    position: relative;
    left: 3px;
    ${StyledLine}:nth-child(3n-1) {
      background: currentColor;
      width: 12px;
    }
    ${StyledLine}:nth-child(n+11) {
      display: none;
    }
  }

  &[data-type='2'] {
    ${StyledLine}:nth-child(2n+1) {
      background: currentColor;
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

  if(_.isEmpty(values)) return null


  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={LineTypeOption as React.FC}
      title="Type de traits"
      disabled={disabled}
      field="lineDash"
      values={values}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default LineTypeField
