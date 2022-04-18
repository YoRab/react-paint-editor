import React from 'react'
import SelectField from './SelectField'
import { POLYGON_POINTS_VALUES } from 'constants/style'
import { styled } from '@linaria/react'

const StyledOption = styled.span``

type PointsNumberOptionType = {
  children: string
}

const PointsNumberOption = ({ children }: PointsNumberOptionType) => {
  return <StyledOption>{children}</StyledOption>
}

type PointsNumberFieldType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const PointsNumberField = ({
  selectedSettings,
  setSelectedSettings,
  disabled = false,
  defaultValue,
  valueChanged
}: PointsNumberFieldType) => {
  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={PointsNumberOption as React.FC}
      title="Nombre de points"
      disabled={disabled}
      field="style.pointsCount"
      values={POLYGON_POINTS_VALUES}
      defaultValue={defaultValue}
      valueChanged={valueChanged}></SelectField>
  )
}

export default PointsNumberField
