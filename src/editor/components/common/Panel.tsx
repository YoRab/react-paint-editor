import { STYLE_ZINDEX } from '@editor/constants/style'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import type React from 'react'
import './Panel.css'
import { type CSSProperties, useId } from 'react'

type PanelType = {
  vertical?: boolean
  children: React.ReactNode
  style?: CSSProperties | undefined
  /** Shown at the top of the panel, which it names */
  title?: string
  className?: string | undefined
  fitContainer?: boolean
  position?: 'bottom' | 'top' | 'left' | 'right' | undefined
  alignment?: 'left' | 'right' | 'center' | undefined
  id?: string | undefined
  panelRef?: React.Ref<HTMLDivElement> | undefined
}

const Panel = ({ children, title = '', className = '', position, fitContainer = false, alignment, style, panelRef, ...props }: PanelType) => {
  const titleId = useId()
  const { lang } = useEditorLocale()
  // a panel with a title is a group of fields named by it
  const group = title ? { role: 'group', 'aria-labelledby': titleId } : {}
  return (
    <div
      className={`react-paint-editor-panel ${className}`}
      data-fitcontainer={fitContainer}
      data-position={position ?? 'unset'}
      data-alignment={alignment ?? 'unset'}
      style={{ ...style, '--react-paint-editor-panel-zindex': STYLE_ZINDEX.PANEL }}
      ref={panelRef}
      lang={lang}
      {...group}
      {...props}
    >
      {title && (
        <h3 className='react-paint-editor-panel-title' id={titleId}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

export default Panel
