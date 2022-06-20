import React from 'react'
import SelectField from './SelectField'
import { styled } from '@linaria/react'
import _ from 'lodash/fp'
import { lineEndIcon } from 'constants/icons'

const StyledLeftTriangle = styled.span`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translate3d(-25%, -50%, 0px);
  display: inline-block;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 15px solid currentColor;
`

const StyledRightTriangle = styled.span`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate3d(25%, -50%, 0px);
  display: inline-block;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 15px solid currentColor;
`

const StyledOption = styled.span`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 2px;
  background: currentColor;
  vertical-align: middle;

  &[data-type='0'],
  &[data-type='1'] {
    ${StyledLeftTriangle} {
      display: none;
    }
  }

  &[data-type='0'],
  &[data-type='2'] {
    ${StyledRightTriangle} {
      display: none;
    }
  }
`

const LineArrowOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <StyledOption data-type={children}>
      <StyledLeftTriangle />
      <StyledRightTriangle />
    </StyledOption>
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
  if (_.isEmpty(values)) return null

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
