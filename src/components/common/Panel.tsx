import React from 'react'
import { STYLE_ZINDEX } from '../../constants/style'
import './Panel.css'

type PanelType = {
  vertical?: boolean
  children: React.ReactNode
  title?: string
  className?: string
  fitContainer?: boolean
  position?: 'bottom' | 'top'
  alignment?: 'left' | 'right' | 'center'
}

const Panel = ({
  children,
  title = '',
  className = '',
  position = 'bottom',
  fitContainer = false,
  alignment = 'center'
}: PanelType) => {
  return (
    <div
      className={`react-paint-editor-panel ${className}`}
      data-fitcontainer={fitContainer}
      data-position={position}
      data-alignment={alignment}
      style={{ '--react-paint-editor-panel-zindex': STYLE_ZINDEX.PANEL }}
    >
      {title && <h3 className='react-paint-editor-panel-title'>{title}</h3>}
      {children}
    </div>
  )
}

export default Panel
