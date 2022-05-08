import React, { useRef, useState } from 'react'
import _ from 'lodash/fp'
import { DrawableShape } from 'types/Shapes'
import useDrag from 'hooks/useDrag'
import { trashIcon, visibilityIcon, visibilityOffIcon } from 'constants/icons'
import { getShapePicture } from 'utils/style'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from './Panel'

const StyledLayouts = styled.div`
  display: inline-block;
  background: var(--bg-color);
  box-sizing: border-box;
  overflow-y: auto;
`

const StyledLayout = styled.div`
  border: 3px solid transparent;
  padding: 4px 0px;
  position: relative;
  background: var(--bg-color);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &[data-is-over='1'] {
    border: 3px dotted var(--btn-hover);
  }

  &[data-is-dragging='1'] {
    opacity: 0.4;
  }

  &[data-selected='1'] {
    color: var(--text-color-selected);
    border: 3px solid var(--bg-color-selected);
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

  > span {
    height: 20px;

    > svg {
      fill: #8a8a8a;
      width: 20px;
      height: 20px;
      padding: 0 16px;
    }
  }
`

const StyledVisibleButton = styled(Button)`
  &[data-visible='0'] {
    opacity: 0.2;
  }
`

const StyledPanelLayouts = styled(Panel)`
  bottom: 0;
  right: 0;
  left: unset;
  top: unset;
`

type LayoutType = {
  disabled?: boolean
  shape: DrawableShape
  selected: boolean
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleRemove: (shape: DrawableShape) => void
  handleSelect: (shape: DrawableShape) => void
  toggleShapeVisibility: (shape: DrawableShape) => void
  onMoveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layout = ({
  disabled = false,
  shape,
  selected,
  layoutDragging,
  toggleShapeVisibility,
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

  const onToggleShapeVisibility = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    toggleShapeVisibility(shape)
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
      <StyledVisibleButton
        title={shape.visible ? 'Hide' : 'Show'}
        data-visible={+(shape.visible !== false)}
        disabled={disabled}
        onClick={onToggleShapeVisibility}
        dangerouslySetInnerHTML={{
          __html: shape.visible === false ? visibilityOffIcon : visibilityIcon
        }}
      />
      <span dangerouslySetInnerHTML={{ __html: getShapePicture(shape.type) }} />
      <Button
        title="Remove"
        disabled={disabled}
        onClick={onRemove}
        dangerouslySetInnerHTML={{ __html: trashIcon }}
      />
    </StyledLayout>
  )
}

type LayoutsType = {
  disabled?: boolean
  shapes: DrawableShape[]
  removeShape: (shape: DrawableShape) => void
  toggleShapeVisibility: (shape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  selectShape: (shape: DrawableShape) => void
  moveShapes: (firstShapeId: string, lastShapeId: string) => void
  withLayouts?: 'always' | 'never' | 'visible' | 'hidden'
  isLayoutPanelShown: boolean
}

const Layouts = ({
  disabled = false,
  shapes,
  removeShape,
  toggleShapeVisibility,
  selectedShape,
  moveShapes,
  selectShape,
  withLayouts,
  isLayoutPanelShown
}: LayoutsType) => {
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)

  return isLayoutPanelShown ? (
    withLayouts === 'always' ? (
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
              toggleShapeVisibility={toggleShapeVisibility}
            />
          ),
          shapes
        )}
      </StyledLayouts>
    ) : (
      <StyledPanelLayouts title="Layouts">
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
                toggleShapeVisibility={toggleShapeVisibility}
              />
            ),
            shapes
          )}
        </StyledLayouts>
      </StyledPanelLayouts>
    )
  ) : null
}

export default Layouts
