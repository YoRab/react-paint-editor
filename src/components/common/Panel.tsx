import React, { useRef } from 'react'
import { styled } from '@linaria/react'

const StyledPanel = styled.div`
  position: absolute;
  background: var(--bg-color);
  bottom: 100%;
  box-shadow: 0 3px 8px rgb(0 0 0 / 24%);
  padding: 4px;
  border-radius: 8px;
  white-space: nowrap;

  &[data-alignment='left'] {
    left: 0;
    margin: 4px;
  }

  &[data-alignment='center'] {
    left: 50%;
    transform: translate3d(-50%, 0px, 0px);
    margin: 4px 0px;
  }

  &[data-alignment='right'] {
    right: 0;
    margin: 4px;
  }
`
const StyledTitle = styled.h3`
  margin-bottom: 8px;
  margin-top: 4px;
  font-size: 18px;
`

type PanelType = {
  vertical?: boolean
  children: React.ReactNode
  title?: string
  className?: string
  alignment?: 'left' | 'right' | 'center'
}

const Panel = ({
  children,
  vertical = false,
  title = '',
  className,
  alignment = 'center'
}: PanelType) => {
  const componentRef = useRef<HTMLDivElement>(null)
  return (
    <StyledPanel
      ref={componentRef}
      className={className}
      data-vertical={+vertical}
      data-alignment={alignment}>
      {title && <StyledTitle>{title}</StyledTitle>}
      {children}
    </StyledPanel>
  )
}

export default Panel
