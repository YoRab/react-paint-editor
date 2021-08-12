import _ from 'lodash/fp'
import React, { useCallback } from 'react'
import styled from 'styled-components'

const StyledToolbox = styled.div``

type ToolType = {
  marker: { type: string }
  onClick: (marker: { type: string }) => void
}

const Tool = ({ marker, onClick }: ToolType) => {
  const handleClick = useCallback(() => {
    onClick(marker)
  }, [])

  return <button onClick={handleClick}>Ligne</button>
}

type ToolboxType = {
  onClick: (marker: { type: string }) => void
}

const Toolbox = ({ onClick }: ToolboxType) => {
  const markers: { type: string }[] = [{ type: 'line' }]

  return (
    <StyledToolbox>
      {_.map(
        marker => (
          <Tool marker={marker} onClick={onClick} />
        ),
        markers
      )}
    </StyledToolbox>
  )
}

export default Toolbox
