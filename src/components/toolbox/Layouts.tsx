import _ from 'lodash/fp'
import React, { useCallback } from 'react'
import { ReactSortable } from 'react-sortablejs'
import styled from 'styled-components'
import map from 'types/lodash'
import { DrawableShape } from 'types/Shapes'

const StyledLayouts = styled(ReactSortable)`
  display: inline-block;
  border: 1px solid black;
  width: 200px;
`

const StyledLayout = styled.div<{ selected: boolean }>`
  border: 1px solid black;
  padding: 12px;
  padding-right: 24px;
  position: relative;
  cursor: pointer;
  ${({ selected }) => selected && 'background:yellow'};
`

const StyledRemove = styled.span`
  position: absolute;
  right: 0;
  cursor: pointer;
`

type LayoutType = {
  shape: DrawableShape
  selected: boolean
  handleRemove: (shape: DrawableShape) => void
  handleSelect: (shape: DrawableShape) => void
}

const Layout = ({ shape, selected, handleRemove, handleSelect }: LayoutType) => {
  const onRemove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      handleRemove(shape)
    },
    [shape, handleRemove]
  )

  const onSelect = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      handleSelect(shape)
    },
    [shape, handleSelect]
  )

  return (
    <StyledLayout onClick={onSelect} selected={selected}>
      {shape.type}
      <StyledRemove onClick={onRemove}>X</StyledRemove>
    </StyledLayout>
  )
}

type LayoutsType = {
  shapes: DrawableShape[]
  setMarkers: React.Dispatch<React.SetStateAction<DrawableShape[]>>
  selectedShape: DrawableShape | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
}

const Layouts = ({ shapes, setMarkers, selectedShape, setSelectedShape }: LayoutsType) => {
  const handleRemove = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(prevSelectedShape => {
        return prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
      })
      setMarkers(prevMakers => _.remove({ id: shape.id }, prevMakers))
    },
    [setMarkers, setSelectedShape]
  )

  const handleSelect = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(shape)
    },
    [setSelectedShape]
  )

  return (
    <StyledLayouts list={shapes} setList={setMarkers}>
      {map(
        (shape: DrawableShape) => (
          <Layout
            key={shape.id}
            shape={shape}
            selected={selectedShape?.id === shape.id}
            handleSelect={handleSelect}
            handleRemove={handleRemove}
          />
        ),
        shapes
      )}
    </StyledLayouts>
  )
}

export default Layouts
