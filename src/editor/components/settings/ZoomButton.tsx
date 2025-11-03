import Button from '@editor/components/common/Button'
import { zoomIn } from '@editor/constants/icons'
import './ZoomButton.css'

type ZoomButtonType = {
  disabled?: boolean | undefined
  toggleZoomPanel: () => void
  className?: string | undefined
}

const ZoomButton = ({ disabled = false, className, toggleZoomPanel }: ZoomButtonType) => {
  return (
    <Button title='Toggle zoom panel' disabled={disabled} onClick={toggleZoomPanel} icon={zoomIn} className={`${className ? ` ${className}` : ''}`} />
  )
}

export default ZoomButton
