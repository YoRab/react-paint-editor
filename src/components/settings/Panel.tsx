import _ from 'lodash/fp'
import React, { useEffect, useRef, useState } from 'react'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'

const StyledPanel = styled.div`
  position: absolute;
  background: var(--bg-color);
  left: 0;
  bottom: 100%;
`

type PanelType = {
  children: JSX.Element
  onClose: () => void
}

const Panel = ({ children, onClose }: PanelType) => {
  const componentRef = useRef<HTMLDivElement>(null)
  return <StyledPanel ref={componentRef}>{children}</StyledPanel>
}

export default Panel
