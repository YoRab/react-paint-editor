import React, { useCallback, useRef, useState } from 'react'
import styled from 'styled-components'
import map from 'types/lodash'
import { DrawableShape } from 'types/Shapes'
import deleteIcon from 'assets/icons/trash.svg'
import { useDrag } from 'hooks/useDrag'

const StyledLayouts = styled.div<{ hover: boolean }>`
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

const StyledLayout = styled.div<{ selected: boolean; isdragging: boolean; isover: boolean }>`
  border: 1px solid black;
  padding: 12px;
  padding-right: 24px;
  position: relative;
  cursor: move;
  ${({ selected }) => selected && 'background:yellow'};
  ${({ isdragging }) => isdragging && 'opacity:0.4'};
  ${({ isover }) => isover && '  border: 3px dotted #666;'};
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
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleRemove: (shape: DrawableShape) => void
  handleSelect: (shape: DrawableShape) => void
  onMoveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layout = ({
  shape,
  selected,
  layoutDragging,
  setLayoutDragging,
  handleRemove,
  handleSelect,
  onMoveShapes
}: LayoutType) => {
  const ref = useRef<HTMLDivElement>(null)

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

  const { isOver } = useDrag({
    ref,
    shape,
    layoutDragging,
    setLayoutDragging,
    handleSelect,
    onMoveShapes
  })

  return (
    <StyledLayout
      draggable="true"
      isdragging={layoutDragging === shape.id}
      isover={isOver}
      onClick={onSelect}
      selected={selected}
      ref={ref}>
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
  removeShape: (shape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  selectShape: (shape: DrawableShape) => void
  moveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layouts = ({
  shapes,
  hover,
  removeShape,
  selectedShape,
  moveShapes,
  selectShape
}: LayoutsType) => {
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)

  return (
    <StyledLayouts hover={hover}>
      {map(
        shape => (
          <Layout
            key={shape.id}
            shape={shape}
            layoutDragging={layoutDragging}
            setLayoutDragging={setLayoutDragging}
            selected={selectedShape?.id === shape.id}
            handleSelect={selectShape}
            handleRemove={removeShape}
            onMoveShapes={moveShapes}
          />
        ),
        shapes
      )}
    </StyledLayouts>
  )
}

export default Layouts
