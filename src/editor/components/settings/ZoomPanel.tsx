import { usePaint, usePaintState, ZOOM_LEVELS } from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { zoomIn, zoomOut } from '@editor/constants/icons'
import type { ReactNode } from 'react'
import './ZoomPanel.css'

type ZoomPanelType = {
  isEditMode: boolean
  /** Shown under the buttons, like the minimap */
  children?: ReactNode
}

const ZoomPanel = ({ isEditMode, children }: ZoomPanelType) => {
  const paint = usePaint()
  const { actions } = paint
  const zoom = usePaintState(paint, state => state.view.zoom)

  return (
    <Panel alignment='left' position='bottom' className='react-paint-editor-layouts-panel react-paint-editor-zoom-panel' data-edit={+isEditMode}>
      <div className='react-paint-editor-zoom-panel-buttons'>
        <Button
          aria-label='Zoom out'
          className='react-paint-editor-zoom-button'
          icon={zoomOut}
          disabled={zoom <= ZOOM_LEVELS[0]}
          onClick={() => actions.setZoom('unzoom')}
        />
        <Button className='react-paint-editor-zoom-button react-paint-editor-zoom-button-value' onClick={() => actions.setZoom('default')}>
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          aria-label='Zoom in'
          className='react-paint-editor-zoom-button'
          icon={zoomIn}
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!}
          onClick={() => actions.setZoom('zoom')}
        />
      </div>
      {children}
    </Panel>
  )
}

export default ZoomPanel
