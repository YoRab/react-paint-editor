import Button from '@editor/components/common/Button'
import { zoomIn } from '@editor/constants/icons'
import type { Disclosure } from '@editor/hooks/useDisclosure'
import './ZoomButton.css'

type ZoomButtonType = {
  disabled?: boolean | undefined
  /** The zoom panel, which the button controls */
  panel: Pick<Disclosure, 'triggerProps'>
  toggleZoomPanel: () => void
  className?: string | undefined
}

const ZoomButton = ({ disabled = false, panel, className, toggleZoomPanel }: ZoomButtonType) => {
  return (
    <Button
      title='Toggle zoom panel'
      disabled={disabled}
      onClick={toggleZoomPanel}
      icon={zoomIn}
      className={`${className ? ` ${className}` : ''}`}
      {...panel.triggerProps}
    />
  )
}

export default ZoomButton
