import _ from 'lodash/fp'
import React, { useCallback } from 'react'
import { ReactSortable } from 'react-sortablejs'
import styled from 'styled-components'
import map from '../../types/lodash'
import { ShapeDrawable } from '../../types/Shapes'

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
  shape: ShapeDrawable
  selected: boolean
  handleRemove: (shape: ShapeDrawable) => void
  handleSelect: (shape: ShapeDrawable) => void
}

const Layout = ({ shape, selected, handleRemove, handleSelect }: LayoutType) => {
  const onRemove = useCallback(
    e => {
      e.preventDefault()
      e.stopPropagation()
      handleRemove(shape)
    },
    [shape]
  )

  const onSelect = useCallback(
    e => {
      e.preventDefault()
      e.stopPropagation()
      handleSelect(shape)
    },
    [shape]
  )

  return (
    <StyledLayout onClick={onSelect} selected={selected}>
      {shape.type}
      <StyledRemove onClick={onRemove}>X</StyledRemove>
    </StyledLayout>
  )
}

type LayoutsType = {
  shapes: ShapeDrawable[]
  setMarkers: React.Dispatch<React.SetStateAction<ShapeDrawable[]>>
  selectedShape: ShapeDrawable | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<ShapeDrawable | undefined>>
}

const Layouts = ({ shapes, setMarkers, selectedShape, setSelectedShape }: LayoutsType) => {
  const handleRemove = useCallback((shape: ShapeDrawable) => {
    setSelectedShape(prevSelectedShape => {
      return prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
    })
    setMarkers(prevMakers => _.remove({ id: shape.id }, prevMakers))
  }, [])

  const handleSelect = useCallback((shape: ShapeDrawable) => {
    setSelectedShape(shape)
  }, [])

  return (
    <StyledLayouts list={shapes} setList={setMarkers}>
      {map(
        (shape: ShapeDrawable) => (
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
