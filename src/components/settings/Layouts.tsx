import React, { useRef, useState } from 'react'
import _ from 'lodash/fp'
import { DrawableShape } from 'types/Shapes'
import useDrag from 'hooks/useDrag'
import {
  lockedIcon,
  trashIcon,
  unlockedIcon,
  visibilityIcon,
  visibilityOffIcon
} from 'constants/icons'
import { getShapePicture } from 'utils/style'
import { styled } from '@linaria/react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'

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
  &[data-visible='false'] {
    opacity: 0.2;
  }
`

const StyledLockedButton = styled(Button)`
  &[data-locked='false'] {
    opacity: 0.2;
  }
`

const StyledPanelLayouts = styled(Panel)`
  bottom: 0;
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
  toggleShapeLock: (shape: DrawableShape) => void
  onMoveShapes: (firstShapeId: string, lastShapeId: string) => void
}

const Layout = ({
  disabled = false,
  shape,
  selected,
  layoutDragging,
  toggleShapeVisibility,
  toggleShapeLock,
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

  const onToggleShapeLock = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    toggleShapeLock(shape)
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

      <StyledVisibleButton
        title={shape.visible ? 'Hide' : 'Show'}
        data-visible={shape.visible !== false}
        disabled={disabled}
        onClick={onToggleShapeVisibility}
        icon={shape.visible === false ? visibilityOffIcon : visibilityIcon}
      />

      <StyledLockedButton
        title={shape.locked ? 'Locked' : 'Unlocked'}
        data-locked={!!shape.locked}
        disabled={disabled}
        onClick={onToggleShapeLock}
        icon={shape.locked ? lockedIcon : unlockedIcon}
      />
      <Button title="Remove" disabled={disabled} onClick={onRemove} icon={trashIcon} />
    </StyledLayout>
  )
}

type LayoutsType = {
  disabled?: boolean
  shapes: DrawableShape[]
  removeShape: (shape: DrawableShape) => void
  toggleShapeVisibility: (shape: DrawableShape) => void
  toggleShapeLock: (shape: DrawableShape) => void
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
  toggleShapeLock,
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
              toggleShapeLock={toggleShapeLock}
            />
          ),
          shapes
        )}
      </StyledLayouts>
    ) : (
      <StyledPanelLayouts title="Layouts" alignment="right">
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
                toggleShapeLock={toggleShapeLock}
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
