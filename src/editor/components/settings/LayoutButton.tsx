import Button from '@editor/components/common/Button'
import { layersIcon } from '@editor/constants/icons'
import type { Disclosure } from '@editor/hooks/useDisclosure'
import './LayoutButton.css'

type LayoutButtonType = {
  disabled: boolean
  /** The layers panel, which the button controls */
  panel: Pick<Disclosure, 'triggerProps'>
  toggleLayoutPanel: () => void
}

const LayoutButton = ({ disabled, panel, toggleLayoutPanel }: LayoutButtonType) => {
  return (
    <Button
      title='Toggle layers panel'
      disabled={disabled}
      onClick={toggleLayoutPanel}
      icon={layersIcon}
      className='react-paint-editor-layout-button'
      {...panel.triggerProps}
    />
  )
}

export default LayoutButton
