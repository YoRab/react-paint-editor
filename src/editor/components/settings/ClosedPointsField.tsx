import { polygonIcon } from '@editor/constants/icons'
import type React from 'react'
import SelectField from './SelectField'

const ClosePointsOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return <span>{children === 0 ? 'Non' : 'Oui'}</span>
}

const VALUES = [0, 1]
type ClosedPointsType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  defaultValue?: number | undefined
  valueChanged: (field: string, value: string | number) => void
}

const ClosedPointsField = ({ selectedSettings, setSelectedSettings, disabled = false, defaultValue, valueChanged }: ClosedPointsType) => {
  return (
    <SelectField
      selectedSettings={selectedSettings}
      setSelectedSettings={setSelectedSettings}
      CustomOption={ClosePointsOption}
      title='Fermer les points'
      icon={polygonIcon}
      disabled={disabled}
      field='closedPoints'
      values={VALUES}
      defaultValue={defaultValue}
      valueChanged={valueChanged}
    />
  )
}

export default ClosedPointsField
