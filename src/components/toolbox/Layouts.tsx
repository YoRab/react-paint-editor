import React, { useCallback } from 'react'
import { ReactSortable } from 'react-sortablejs'
import styled from 'styled-components'
import map from 'types/lodash'
import { DrawableShape, ToolEnum, ToolsType } from 'types/Shapes'
import deleteIcon from 'assets/icons/trash.svg'

const StyledLayouts = styled(ReactSortable)<{ hover: boolean }>`
  display: inline-block;
  border: 1px solid black;
  width: 200px;
  overflow-y: auto;

  ${({ hover }) =>
    hover &&
    `
    position:absolute;
    right:0;
    height:60%;
  `}
`

const StyledLayout = styled.div<{ selected: boolean }>`
  border: 1px solid black;
  padding: 12px;
  padding-right: 24px;
  position: relative;
  cursor: pointer;
  ${({ selected }) => selected && 'background:yellow'};
`

const StyledRemove = styled.div`
  position: absolute;
  width: 36px;
  display: inline-block;
  right: 0;
  top: 0;
  bottom: 0;
  cursor: pointer;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: lightgray;
  }

  img {
    width: 16px;
    height: 16px;
  }
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
      <StyledRemove onClick={onRemove}>
        <img src={deleteIcon} />
      </StyledRemove>
    </StyledLayout>
  )
}

type LayoutsType = {
  shapes: DrawableShape[]
  hover: boolean
  updateShapes: (shapes: DrawableShape[]) => void
  removeShape: (shape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  setSelectedShape: React.Dispatch<React.SetStateAction<DrawableShape | undefined>>
  setActiveTool: React.Dispatch<React.SetStateAction<ToolsType>>
}

const Layouts = ({
  shapes,
  hover,
  updateShapes,
  removeShape,
  selectedShape,
  setSelectedShape,
  setActiveTool
}: LayoutsType) => {
  const setList = useCallback(
    (markers: DrawableShape[]) => {
      updateShapes(markers)
    },
    [updateShapes]
  )

  const handleSelect = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(shape)
      setActiveTool(ToolEnum.selection)
    },
    [setSelectedShape, setActiveTool]
  )

  return (
    <StyledLayouts list={shapes} setList={setList} hover={hover}>
      {map(
        shape => (
          <Layout
            key={shape.id}
            shape={shape}
            selected={selectedShape?.id === shape.id}
            handleSelect={handleSelect}
            handleRemove={removeShape}
          />
        ),
        shapes
      )}
    </StyledLayouts>
  )
}

export default Layouts
