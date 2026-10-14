import { usePaint } from '@common/context/PaintContext'
import usePaintState from '@common/hooks/usePaintState'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { zoomIn, zoomOut } from '@editor/constants/icons'

const ZoomPanel = ({ isEditMode }: { isEditMode: boolean }) => {
  const paint = usePaint()
  const { actions } = paint
  const zoom = usePaintState(paint, state => state.view.zoom)

  return (
    <Panel alignment='left' position='bottom' className='react-paint-editor-layouts-panel' data-edit={+isEditMode}>
      <Button aria-label='Zoom out' className='react-paint-editor-zoom-button' icon={zoomOut} onClick={() => actions.setZoom('unzoom')} />
      <Button className='react-paint-editor-zoom-button react-paint-editor-zoom-button-value' onClick={() => actions.setZoom('default')}>
        {Math.round(zoom * 100)}%
      </Button>
      <Button aria-label='Zoom in' className='react-paint-editor-zoom-button' icon={zoomIn} onClick={() => actions.setZoom('zoom')} />
    </Panel>
  )
}

export default ZoomPanel
