import React, { ReactNode } from 'react'
import { styled } from '@linaria/react'
import { STYLE_ZINDEX_PANEL } from 'constants/style'

const StyledModal = styled.div`
  z-index: ${STYLE_ZINDEX_PANEL};
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
`

const StyledPanel = styled.div`
  display: grid;
  background: var(--toolbar-bg);
  box-shadow: 0 3px 8px rgb(0 0 0 / 24%);
  padding: 12px;
  border-radius: 8px;
  white-space: nowrap;
  position: relative;
`

const StyledMask = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: #00000073;
`

type ModalType = {
  children: ReactNode
  onClose: () => void
  className?: string
}

const Modal = ({ children, onClose, className }: ModalType) => {
  return (
    <StyledModal>
      <StyledMask onClick={onClose} />
      <StyledPanel className={className}>{children}</StyledPanel>
    </StyledModal>
  )
}

export default Modal
