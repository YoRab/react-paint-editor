import { STYLE_ZINDEX } from '@editor/constants/style'
import type { ReactNode } from 'react'
import './Modal.css'

type ModalType = {
  children: ReactNode
  title: string
  onClose: () => void
  position?: 'center' | 'bottom'
  className?: string
}

const Modal = ({ children, onClose, position = 'center', title, className = '' }: ModalType) => {
  return (
    <div
      className='react-paint-editor-modal'
      data-position={position}
      style={{ '--react-paint-editor-modal-zindex': STYLE_ZINDEX.PANEL }}
      role='dialog'
      aria-modal='true'
      aria-labelledby={title}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal mask should not be exposed to screen readers*/}
      <div className='react-paint-editor-modal-mask' onClick={onClose} />
      <div className={`react-paint-editor-modal-panel ${className}`}>{children}</div>
    </div>
  )
}

export default Modal
