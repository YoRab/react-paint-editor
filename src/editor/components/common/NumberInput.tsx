import type React from 'react'
import { useState } from 'react'

type NumberInputType = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  /** The value shown, rounded, while the field is not typed in */
  value: number | undefined
  min?: number | undefined
  max?: number | undefined
  /** Called with each number typed inside the limits */
  onValueChange: (value: number) => void
}

/** A number typed in a field: the text typed is kept while the field has the focus, it can be empty or out of the limits for a moment */
const NumberInput = ({ value, min, max, onValueChange, onBlur, ...inputProps }: NumberInputType) => {
  const [draft, setDraft] = useState<string | undefined>(undefined)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value)
    const typedValue = event.target.valueAsNumber
    if (!Number.isFinite(typedValue) || (min !== undefined && typedValue < min) || (max !== undefined && typedValue > max)) return
    onValueChange(typedValue)
  }

  return (
    <input
      type='number'
      min={min}
      max={max}
      value={draft ?? (value === undefined ? '' : Math.round(value))}
      onChange={handleChange}
      onBlur={e => {
        setDraft(undefined)
        onBlur?.(e)
      }}
      {...inputProps}
    />
  )
}

export default NumberInput
