import React, { ReactNode } from 'react'
import { styled } from '@linaria/react'

const StyledModal = styled.div`
  z-index: 2;
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
  grid-template-columns: 1fr 1fr 1fr;
  background: var(--bg-color);
  box-shadow: 0 3px 8px rgb(0 0 0 / 24%);
  padding: 4px;
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
}

const Modal = ({ children, onClose }: ModalType) => {
  return (
    <StyledModal>
      <StyledMask onClick={onClose} />
      <StyledPanel>{children}</StyledPanel>
    </StyledModal>
  )
}

export default Modal
