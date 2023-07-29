import _ from 'lodash/fp'
import React, { CSSProperties, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { paletteIcon, noStrokeIcon, noFillIcon } from 'constants/icons'
import './ColorField.css'

type ShapeStyleColorType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean
  field: string
  mode?: 'fill' | 'stroke'
  value?: string | undefined
  values: string[]
  valueChanged: (field: string, value: string | number) => void
}

const ColorField = ({
  selectedSettings,
  setSelectedSettings,
  title = 'Choisissez une couleur',
  mode = 'fill',
  disabled = false,
  values,
  field,
  value = '',
  valueChanged
}: ShapeStyleColorType) => {
  const [customKey] = useState(_.uniqueId('settings_'))
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = _.toNumber(event.target.value)
    valueChanged(field, _.isNaN(parsedValue) ? event.target.value : parsedValue)
  }

  const handleClick = (value: string) => {
    valueChanged(field, value)
  }

  const togglePanel = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
  }

  const isPanelVisible = selectedSettings === customKey

  if (_.isEmpty(values)) return null

  return (
    <>
      <Button
        selected={isPanelVisible}
        title={title}
        disabled={disabled}
        onClick={togglePanel}
        icon={value === 'transparent' ? (mode === 'fill' ? noFillIcon : noStrokeIcon) : undefined}>
        {value !== 'transparent' && <div
          className='react-paint-editor-colorfield-color'
          data-mode={mode}
          style={{
            '--react-paint-editor-colorfield-color-value': value
          } as CSSProperties} />}
      </Button>
      {isPanelVisible && (
        <Panel title={title} alignment="left">
          <div className='react-paint-editor-colorfield-wrapper'>
            {values.map((color, index) => (
              <Button
                title={color}
                key={index}
                selected={color === value}
                color={color}
                icon={
                  color === 'transparent'
                    ? mode === 'fill'
                      ? noFillIcon
                      : noStrokeIcon
                    : undefined
                }
                onClick={() => handleClick(color)}>
                {color !== 'transparent' && <div
                  className='react-paint-editor-colorfield-color'
                  color={color}
                  data-mode={mode}
                  style={{
                    '--react-paint-editor-colorfield-color-value': color
                  } as CSSProperties} />}
              </Button>
            ))}
            <Button
              type="color"
              title="Custom color"
              selected={!_.includes(value, values)}
              value={value}
              onChange={handleChange}>
              <div
                className='react-paint-editor-colorfield-customcolor'
                style={{
                  '--react-paint-editor-colorfield-color-value': _.includes(value, values) ? 'var(--font-color)' : value
                } as CSSProperties}
              >
                <span dangerouslySetInnerHTML={{ __html: paletteIcon }} />
              </div>
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

export default ColorField
