import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from './Panel'
import { STYLE_COLORS } from 'constants/style'

const StyledColor = styled.div<{
  color: string
}>`
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1px solid gray;
  background: ${({ color }) => color};
`

const StyledColorButton = styled(Button)`
  border-radius: 50%;
`

const StyledColorInput = styled.input`
  border-radius: 50%;
  border: none;
  padding: 0;
  margin: 0;
  width: 24px;
  height: 24px;
  background-color: transparent;
  font-size: inherit;
  line-height: inherit;
  &[data-disabled='1'] {
    opacity: 0.25;
    cursor: default;
  }

  &[data-disabled='0'] {
    cursor: pointer;
    &:hover {
      background: var(--btn-hover);
    }
  }
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
      <Button selected={isPanelVisible} disabled={disabled} onClick={togglePanel}>
        <StyledColor color={value} />
      </Button>
      {isPanelVisible && (
        <Panel>
          <>
            <div>{title}</div>
            <div>
              {STYLE_COLORS.map((color, index) => (
                <StyledColorButton
                  key={index}
                  selected={color === value}
                  color={color}
                  onClick={() => handleClick(color)}>
                  <StyledColor color={color} />
                </StyledColorButton>
              ))}
              <StyledColorInput
                type="color"
                value={value}
                onChange={handleChange}></StyledColorInput>
            </div>
          </>
        </Panel>
      )}
    </>
  )
}

export default ColorField
