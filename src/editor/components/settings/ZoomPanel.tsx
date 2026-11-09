import { formatNumber, usePaint, usePaintState, ZOOM_LEVELS } from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { zoomIn, zoomOut } from '@editor/constants/icons'
import { ZOOM_FORMAT } from '@editor/constants/locale'
import useArrowNavigation from '@editor/hooks/useArrowNavigation'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import type React from 'react'
import type { ReactNode } from 'react'
import './ZoomPanel.css'

type ZoomPanelType = {
  isEditMode: boolean
  /** Shown under the buttons, like the minimap */
  children?: ReactNode
  /** Id of the panel, which its button controls */
  id?: string | undefined
  panelRef?: React.Ref<HTMLDivElement>
}

const ZoomPanel = ({ isEditMode, children, id, panelRef }: ZoomPanelType) => {
  const paint = usePaint()
  const { actions } = paint
  const zoom = usePaintState(paint, state => state.view.zoom)
  // the buttons are a single stop of Tab, the minimap another one
  const buttonsRef = useArrowNavigation()
  const { lang, editor } = useEditorLocale()
  const messages = editor.zoom

  return (
    <Panel
      alignment='left'
      position='bottom'
      className='react-paint-editor-layouts-panel react-paint-editor-zoom-panel'
      data-edit={+isEditMode}
      id={id}
      panelRef={panelRef}
    >
      <div className='react-paint-editor-zoom-panel-buttons' ref={buttonsRef}>
        <Button
          aria-label={messages.zoomOut}
          title={messages.zoomOut}
          className='react-paint-editor-zoom-button'
          icon={zoomOut}
          disabled={zoom <= ZOOM_LEVELS[0]}
          onClick={() => actions.setZoom('unzoom')}
        />
        {/* named by the zoom it shows, the title tells what it does */}
        <Button
          className='react-paint-editor-zoom-button react-paint-editor-zoom-button-value'
          title={messages.reset}
          onClick={() => actions.setZoom('default')}
        >
          {formatNumber(zoom, lang, ZOOM_FORMAT)}
        </Button>
        <Button
          aria-label={messages.zoomIn}
          title={messages.zoomIn}
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
