import { STYLE_ZINDEX } from '@editor/constants/style'
import type React from 'react'
import './Panel.css'
import type { CSSProperties } from 'react'

type PanelType = {
  vertical?: boolean
  children: React.ReactNode
  style?: CSSProperties | undefined
  title?: string
  className?: string | undefined
  fitContainer?: boolean
  position?: 'bottom' | 'top' | undefined
  alignment?: 'left' | 'right' | 'center' | undefined
}

const Panel = ({ children, title = '', className = '', position, fitContainer = false, alignment, style, ...props }: PanelType) => {
  return (
    <div
      className={`react-paint-editor-panel ${className}`}
      data-fitcontainer={fitContainer}
      data-position={position ?? 'unset'}
      data-alignment={alignment ?? 'unset'}
      style={{ ...style, '--react-paint-editor-panel-zindex': STYLE_ZINDEX.PANEL }}
      {...props}
    >
      {title && <h3 className='react-paint-editor-panel-title'>{title}</h3>}
      {children}
    </div>
  )
}

export default Panel
