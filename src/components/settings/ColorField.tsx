import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { paletteIcon, noStrokeIcon, noFillIcon } from 'constants/icons'

const StyledColor = styled.div<{
  color: string
}>`
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border-radius: 50%;

  &[data-mode='fill'] {
    border: 1px solid #80808038;
    background: ${({ color }) => color};
  }

  &[data-mode='stroke'] {
    border: 4px solid #80808038;

    &:after {
      content: '';
      display: block;
      border-radius: 100%;
      border: 2px solid ${({ color }) => color};
      position: relative;
      width: 18px;
      height: 18px;
      left: -3px;
      top: -3px;
      box-sizing: border-box;
    }
  }
`

const StyleWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const StyledCustomColor = styled.div<{
  color: string
}>`
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border-radius: 50%;
  color: ${({ color }) => color};
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-weight: bold;
`

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
        {value !== 'transparent' && <StyledColor color={value} data-mode={mode} />}
      </Button>
      {isPanelVisible && (
        <Panel title={title} alignment="left">
          <StyleWrapper>
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
                {color !== 'transparent' && <StyledColor color={color} data-mode={mode} />}
              </Button>
            ))}
            <Button
              type="color"
              title="Custom color"
              selected={!_.includes(value, values)}
              value={value}
              onChange={handleChange}>
              <StyledCustomColor color={_.includes(value, values) ? 'var(--font-color)' : value}>
                <span dangerouslySetInnerHTML={{ __html: paletteIcon }} />
              </StyledCustomColor>
            </Button>
          </StyleWrapper>
        </Panel>
      )}
    </>
  )
}

export default ColorField
