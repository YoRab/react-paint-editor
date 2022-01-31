import React, { useRef, useState } from 'react'
import styled from 'styled-components'
import _ from 'lodash/fp'
import { DrawableShape } from 'types/Shapes'
import useDrag from 'hooks/useDrag'
import { trashIcon } from 'constants/icons'

const StyledLayouts = styled.div<{ hover: boolean }>`
  display: inline-block;
  background: var(---shrinkedcanvas-bg-color);
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
  border: 1px solid var(--btn-hover);
  padding: 12px;
  padding-right: 24px;
  position: relative;
  cursor: move;
  ${({ selected }) => selected && 'background:var(--btn-hover)'};
  ${({ isdragging }) => isdragging && 'opacity:0.4'};
  ${({ isover }) => isover && '  border: 3px dotted var(--btn-hover);'};
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
    background: var(--btn-hover);
  }

  svg {
    color: inherit;
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

  const onRemove = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    handleRemove(shape)
  }

  const onSelect = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    handleSelect(shape)
  }

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
      <StyledRemove onClick={onRemove}  dangerouslySetInnerHTML={{__html: trashIcon}}>
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
      {_.map(
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
