import React from 'react'
import SelectField from './SelectField'
import { STYLE_LINE_WITH_ARROW } from 'constants/style'
import { styled } from '@linaria/react'

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
  border-right: 15px solid black;
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
  border-left: 15px solid black;
`

const StyledOption = styled.span`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 2px;
  background: black;
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

const LineArrowOption: React.FC = ({ children }) => {
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
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const LineArrowField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  defaultValue,
  valueChanged
}: LineArrowType) => {
  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={LineArrowOption}
      title="Flèches"
      disabled={disabled}
      field="style.lineArrow"
      values={STYLE_LINE_WITH_ARROW}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default LineArrowField
