import React, { useState } from 'react'
import Button from '../../components/common/Button'
import { uniqueId } from '../../utils/util'

type ShapeStyleSelectType = {
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  disabled?: boolean
  field: string
  icon: string
  values: boolean[]
  value?: boolean
  valueChanged: (field: string, value: boolean) => void
}

const ToggleField = ({
  setSelectedSettings,
  disabled = false,
  field,
  icon,
  values,
  value = false,
  valueChanged
}: ShapeStyleSelectType) => {
  const [customKey] = useState(uniqueId('settings_'))

  const handleClick = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
    valueChanged(field, !value)
  }

  if (values.length !== 2) return null

  return <Button onClick={handleClick} selected={value} disabled={disabled} icon={icon} />
}

export default ToggleField
