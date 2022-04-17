import React from 'react'
import { styled } from '@linaria/react'
import { layersIcon } from 'constants/icons'
import Button from 'components/common/Button'

const StyleToggleLayoutButton = styled(Button)`
  .layoutPanelOpened & {
    color: var(--text-color-selected);
    background: var(--bg-color-selected);
  }
`

type LayoutButtonType = {
  disabled: boolean
  withLayouts?: 'always' | 'never' | 'visible' | 'hidden'
  toggleLayoutPanel: () => void
}

const LayoutButton = ({ withLayouts, disabled, toggleLayoutPanel }: LayoutButtonType) => {
  return (
    <StyleToggleLayoutButton
      data-hidden={+(withLayouts === 'always' || withLayouts === 'never')}
      disabled={disabled}
      data-disabled={+disabled}
      onClick={toggleLayoutPanel}
      dangerouslySetInnerHTML={{ __html: layersIcon }}
    />
  )
}

export default LayoutButton
