import { STYLE_ZINDEX } from '@editor/constants/style'
import React, { type ReactNode } from 'react'
import './Modal.css'

type ModalType = {
  children: ReactNode
  onClose: () => void
  position?: 'center' | 'bottom'
  className?: string
}

const Modal = ({ children, onClose, position = 'center', className = '' }: ModalType) => {
  return (
    <div className='react-paint-editor-modal' data-position={position} style={{ '--react-paint-editor-modal-zindex': STYLE_ZINDEX.PANEL }}>
      <div className='react-paint-editor-modal-mask' onClick={onClose} />
      <div className={`react-paint-editor-modal-panel ${className}`}>{children}</div>
    </div>
  )
}

export default Modal
