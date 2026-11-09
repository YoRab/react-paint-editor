import Button from '@editor/components/common/Button'
import { zoomIn } from '@editor/constants/icons'
import type { Disclosure } from '@editor/hooks/useDisclosure'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import './ZoomButton.css'

type ZoomButtonType = {
  disabled?: boolean | undefined
  /** The zoom panel, which the button controls */
  panel: Pick<Disclosure, 'triggerProps'>
  toggleZoomPanel: () => void
  className?: string | undefined
}

const ZoomButton = ({ disabled = false, panel, className, toggleZoomPanel }: ZoomButtonType) => {
  const { editor } = useEditorLocale()
  return (
    <Button
      title={editor.zoom.togglePanel}
      disabled={disabled}
      onClick={toggleZoomPanel}
      icon={zoomIn}
      className={`${className ? ` ${className}` : ''}`}
      {...panel.triggerProps}
    />
  )
}

export default ZoomButton
