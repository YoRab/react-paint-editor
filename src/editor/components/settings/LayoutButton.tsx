import Button from '@editor/components/common/Button'
import { layersIcon } from '@editor/constants/icons'
import './LayoutButton.css'

type LayoutButtonType = {
  disabled: boolean
  toggleLayoutPanel: () => void
}

const LayoutButton = ({ disabled, toggleLayoutPanel }: LayoutButtonType) => {
  return (
    <Button
      title='Toggle layers panel'
      disabled={disabled}
      onClick={toggleLayoutPanel}
      icon={layersIcon}
      className='react-paint-editor-layout-button'
    />
  )
}

export default LayoutButton
