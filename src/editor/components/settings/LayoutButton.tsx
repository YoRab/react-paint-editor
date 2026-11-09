import Button from '@editor/components/common/Button'
import { layersIcon } from '@editor/constants/icons'
import type { Disclosure } from '@editor/hooks/useDisclosure'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import './LayoutButton.css'

type LayoutButtonType = {
  disabled: boolean
  /** The layers panel, which the button controls */
  panel: Pick<Disclosure, 'triggerProps'>
  toggleLayoutPanel: () => void
}

const LayoutButton = ({ disabled, panel, toggleLayoutPanel }: LayoutButtonType) => {
  const { editor } = useEditorLocale()
  return (
    <Button
      title={editor.layers.togglePanel}
      disabled={disabled}
      onClick={toggleLayoutPanel}
      icon={layersIcon}
      className='react-paint-editor-layout-button'
      {...panel.triggerProps}
    />
  )
}

export default LayoutButton
