import React, { useRef, useState } from 'react'
import _ from 'lodash/fp'
import { DrawableShape } from 'types/Shapes'
import useDrag from 'hooks/useDrag'
import { trashIcon } from 'constants/icons'
import { getShapePicture } from 'utils/style'
import { styled } from '@linaria/react'

const StyledLayouts = styled.div`
  display: inline-block;
  /* background: var(--shrinkedcanvas-bg-color); */
  background: var(--bg-color);
  /* border: 3px solid var(--text-color); */
  box-sizing: border-box;
  width: 80px;
  overflow-y: auto;
`

const StyledLayout = styled.div`
  border-bottom: 1px solid var(--btn-hover);
  padding: 12px;
  padding-right: 24px;
  position: relative;
  background: var(--bg-color);

  &[data-is-over='1'] {
    border: 3px dotted var(--btn-hover);
  }

  &[data-is-dragging='1'] {
    opacity: 0.4;
  }

  &[data-selected='1'] {
    color: var(--text-color-selected);
    background: var(--bg-color-selected);
  }

  &[data-selected='0'][data-disabled='0'] {
    &:hover {
      background: var(--btn-hover);
    }
  }

  &[data-disabled='1'] {
    opacity: 0.25;
    cursor: default;
  }

  &[data-disabled='0'] {
    cursor: move;
  }

  > span > svg {
    color: #8a8a8a;
    width: 16px;
    height: 16px;
  }
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

  &[data-disabled='1'] {
    opacity: 0.25;
    cursor: default;
  }

  &[data-disabled='0'] {
    cursor: move;
    &:hover {
      background: var(--btn-hover);
    }
  }

  svg {
    color: inherit;
    width: 16px;
    height: 16px;
  }
`

type LayoutType = {
  disabled?: boolean
  shape: DrawableShape
  selected: boolean
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleRemove: (shape: DrawableShape) => void
  handleSelect: (shape: DrawableShape) => void
  onMoveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layout = ({
  disabled = false,
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
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    handleRemove(shape)
  }

  const onSelect = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    handleSelect(shape)
  }

  const { isOver } = useDrag({
    disabled,
    ref,
    shape,
    layoutDragging,
    setLayoutDragging,
    handleSelect,
    onMoveShapes
  })

  return (
    <StyledLayout
      data-disabled={+disabled}
      draggable={!disabled}
      data-is-dragging={+(layoutDragging === shape.id)}
      data-is-over={+isOver}
      onClick={onSelect}
      data-selected={+selected}
      ref={ref}>
      <span dangerouslySetInnerHTML={{ __html: getShapePicture(shape.type) }} />

      <StyledRemove
        data-disabled={disabled}
        onClick={onRemove}
        dangerouslySetInnerHTML={{ __html: trashIcon }}></StyledRemove>
    </StyledLayout>
  )
}

type LayoutsType = {
  disabled?: boolean
  shapes: DrawableShape[]
  removeShape: (shape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  selectShape: (shape: DrawableShape) => void
  moveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layouts = ({
  disabled = false,
  shapes,
  removeShape,
  selectedShape,
  moveShapes,
  selectShape
}: LayoutsType) => {
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)

  return (
    <StyledLayouts>
      {_.map(
        shape => (
          <Layout
            key={shape.id}
            shape={shape}
            disabled={disabled}
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
