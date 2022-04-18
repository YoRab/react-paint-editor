import _ from 'lodash/fp'
import React, { useRef } from 'react'
import { styled } from '@linaria/react'

const StyledPanel = styled.div`
  position: absolute;
  background: var(--bg-color);
  left: 0;
  bottom: 100%;
  box-shadow: 0 3px 8px rgb(0 0 0 / 24%);
  padding: 12px;
  margin: 8px;
`
const StyledTitle = styled.h3`
  margin-bottom: 8px;
  margin-top: 4px;
  font-size: 18px;
`

type PanelType = {
  children: JSX.Element
  title?: string
}

const Panel = ({ children, title = '' }: PanelType) => {
  const componentRef = useRef<HTMLDivElement>(null)
  return (
    <StyledPanel ref={componentRef}>
      {title && <StyledTitle>{title}</StyledTitle>}
      {children}
    </StyledPanel>
  )
}

export default Panel
