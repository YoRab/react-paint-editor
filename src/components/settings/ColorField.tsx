import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { STYLE_COLORS } from 'constants/style'
import { encodedTransparentIcon, paletteIcon } from 'constants/icons'

const StyledColor = styled.div<{
  color: string
}>`
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1px solid gray;
  background: ${({ color }) => color};
  background-repeat: repeat;
  background-size: 16px;
`

const StyledCustomColor = styled.div<{
  color: string
}>`
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border-radius: 50%;
  color: ${({ color }) => color};
  display: flex;
  align-items: baseline;
  justify-content: center;
  line-height: 36px;
  font-weight: bold;
`

type ShapeStyleColorType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean
  field: string
  value?: string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const ColorField = ({
  selectedSettings,
  setSelectedSettings,
  title = 'Choisissez une couleur',
  disabled = false,
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

  return (
    <>
      <Button selected={isPanelVisible} title={title} disabled={disabled} onClick={togglePanel}>
        <StyledColor
          color={
            value === 'transparent' ? `url('data:image/svg+xml,${encodedTransparentIcon}')` : value
          }
        />
      </Button>
      {isPanelVisible && (
        <Panel title={title} alignment="left">
          <div>
            {STYLE_COLORS.map((color, index) => (
              <Button
                title={color}
                key={index}
                selected={color === value}
                color={color}
                onClick={() => handleClick(color)}>
                <StyledColor
                  color={
                    color === 'transparent'
                      ? `url('data:image/svg+xml,${encodedTransparentIcon}')`
                      : color
                  }
                />
              </Button>
            ))}
            <Button
              type="color"
              title="Custom color"
              selected={!_.includes(value, STYLE_COLORS)}
              value={value}
              onChange={handleChange}>
              <StyledCustomColor
                color={_.includes(value, STYLE_COLORS) ? 'var(--font-color)' : value}>
                <span dangerouslySetInnerHTML={{ __html: paletteIcon }} />
              </StyledCustomColor>
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

export default ColorField
