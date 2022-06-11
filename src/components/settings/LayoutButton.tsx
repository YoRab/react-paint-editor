import React from 'react'
import { styled } from '@linaria/react'
import { layersIcon } from 'constants/icons'
import Button from 'components/common/Button'

const StyleToggleLayoutButton = styled(Button)`
  .layoutPanelOpened & {
    color: var(--text-color-selected);
    background: var(--bg-color-selected);
  }

  &[data-hidden='1'] {
    display: none;
  }
`

type LayoutButtonType = {
  disabled: boolean
  layersManipulation?: boolean
  toggleLayoutPanel: () => void
}

const LayoutButton = ({ layersManipulation, disabled, toggleLayoutPanel }: LayoutButtonType) => {
  return (
    <StyleToggleLayoutButton
      title="Toggle layers panel"
      data-hidden={!layersManipulation}
      disabled={disabled}
      onClick={toggleLayoutPanel}
      icon={layersIcon}
    />
  )
}

export default LayoutButton
