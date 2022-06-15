import { styled } from '@linaria/react'
import { STYLE_ZINDEX_LOADING } from 'constants/style'
import React, { useEffect, useState } from 'react'

const TRANSITION_DURATION = 300

const StyledLoading = styled.div`
  display: flex;
  position: absolute;
  z-index: ${STYLE_ZINDEX_LOADING};
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  justify-content: center;
  align-items: center;
  background: #00000050;
  transition: opacity ${TRANSITION_DURATION}ms linear;
  opacity: 0;
  &[data-loading='visible'] {
    opacity: 1;
  }
`

const StyledLoader = styled.div`
  @keyframes react-paint-rotation {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  width: 40px;
  height: 40px;
  position: relative;
  transform: rotate(10deg);
  animation: react-paint-rotation 1s infinite;
`

const StyledShape = styled.div`
  border-radius: 50%;
  position: absolute;
  width: 15px;
  height: 15px;

  &:nth-child(1) {
    left: 0;
    background-color: #5c6bc0;
  }
  &:nth-child(2) {
    right: 0;
    background-color: #8bc34a;
  }
  &:nth-child(3) {
    bottom: 0;
    background-color: #ffb74d;
  }
  &:nth-child(4) {
    bottom: 0;
    right: 0;
    background-color: #f44336;
  }
`

export type LoadingType = {
  isLoading: boolean
}

type LoadingStateType = 'hidden' | 'visible' | 'fadeOut'

const Loading = ({ isLoading = false }: LoadingType) => {
  const [loadingState, setLoadingState] = useState<LoadingStateType>('hidden')
  useEffect(() => {
    if (isLoading) {
      setLoadingState('visible')
    } else {
      setLoadingState('fadeOut')
      const fadeOutTimeout = setTimeout(() => setLoadingState('hidden'), TRANSITION_DURATION)
      return () => {
        clearTimeout(fadeOutTimeout)
      }
    }
  }, [isLoading])

  return loadingState === 'hidden' ? null : (
    <StyledLoading data-loading={loadingState}>
      <StyledLoader>
        <StyledShape />
        <StyledShape />
        <StyledShape />
        <StyledShape />
      </StyledLoader>
    </StyledLoading>
  )
}

export default Loading
