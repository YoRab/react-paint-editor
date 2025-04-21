import { STYLE_ZINDEX } from '@editor/constants/style'
import type React from 'react'
import './Panel.css'
import type { CSSProperties } from 'react'

type PanelType = {
  vertical?: boolean
  children: React.ReactNode
  style?: CSSProperties
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
  alignment = 'center',
  style,
  ...props
}: PanelType) => {
  return (
    <div
      className={`react-paint-editor-panel ${className}`}
      data-fitcontainer={fitContainer}
      data-position={position}
      data-alignment={alignment}
      style={{ ...style, '--react-paint-editor-panel-zindex': STYLE_ZINDEX.PANEL }}
      {...props}
    >
      {title && <h3 className='react-paint-editor-panel-title'>{title}</h3>}
      {children}
    </div>
  )
}

export default Panel
