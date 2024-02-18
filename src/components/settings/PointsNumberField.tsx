import { polygonIcon } from '../../constants/icons'
import React from 'react'
import RangeField from './RangeField'

type PointsNumberFieldType = {
	selectedSettings: string | undefined
	setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
	disabled?: boolean
	min: number
	max: number
	step: number
	value?: number | undefined
	valueChanged: (field: string, value: string | number) => void
}

const PointsNumberField = ({
	selectedSettings,
	setSelectedSettings,
	disabled = false,
	min,
	max,
	step,
	value,
	valueChanged
}: PointsNumberFieldType) => {
	if (min === max) return null

	return (
		<RangeField
			selectedSettings={selectedSettings}
			setSelectedSettings={setSelectedSettings}
			icon={polygonIcon}
			title='Nombre de points'
			disabled={disabled}
			field='pointsCount'
			min={min}
			max={max}
			step={step}
			unity=''
			value={value}
			valueChanged={valueChanged}
		/>
	)
}

export default PointsNumberField
