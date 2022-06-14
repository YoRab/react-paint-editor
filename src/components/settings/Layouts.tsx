import React, { useRef, useState } from 'react'
import _ from 'lodash/fp'
import { DrawableShape } from 'types/Shapes'
import useDrag from 'hooks/useDrag'
import {
  gridOffIcon,
  gridOnIcon,
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
  background: var(--toolbar-bg);
  box-sizing: border-box;
  overflow-y: auto;
  min-width: 200px;
`

const StyledLayout = styled.div`
  border: 3px solid transparent;
  padding: 4px 0px;
  position: relative;
  background: var(--toolbar-bg);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &[data-is-over='1'] {
    border: 3px dotted var(--font-hover-bg);
  }

  &[data-is-dragging='1'] {
    opacity: 0.4;
  }

  &[data-selected='1'] {
    color: var(--font-selected-color);
    background: var(--font-selected-bg);
  }

  &[data-selected='0'][data-disabled='0'] {
    background: var(--font-bg);
    color: var(--font-color);
    &:hover {
      color: var(--font-hover-color);
      background: var(--font-hover-bg);
    }
  }

  &[data-disabled='1'] {
    cursor: default;
    color: var(--font-disabled-color);
    background: var(--font-disabled-bg);
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

const StyledGridButton = styled(Button)`
  &[data-grid='false'] {
    svg {
      opacity: 0.2;
    }
  }
`

const StyledSeparator = styled.div`
  flex: 1;
`

const StyledPanelLayouts = styled(Panel)`
  bottom: 0;
  left: unset;
  top: unset;
  max-height: 100%;
  display: flex;
  flex-direction: column;
`

const StyledScrollingContent = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`

const StyledPlaceholder = styled.div`
  opacity: 0.6;
  text-align: center;
  padding: 12px 0px;
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
      <span>{shape.id}</span>
      <StyledSeparator />

      <StyledVisibleButton
        title={shape.visible ? 'Hide' : 'Show'}
        data-visible={shape.visible !== false}
        disabled={disabled}
        selected={selected}
        onClick={onToggleShapeVisibility}
        icon={shape.visible === false ? visibilityOffIcon : visibilityIcon}
      />

      <StyledLockedButton
        title={shape.locked ? 'Locked' : 'Unlocked'}
        data-locked={!!shape.locked}
        disabled={disabled}
        selected={selected}
        onClick={onToggleShapeLock}
        icon={shape.locked ? lockedIcon : unlockedIcon}
      />
      {/* <Button title="Remove" disabled={disabled} onClick={onRemove} icon={trashIcon} /> */}
    </StyledLayout>
  )
}

type LayoutsType = {
  withGrid: boolean
  setWithGrid: React.Dispatch<React.SetStateAction<boolean>>
  disabled?: boolean
  shapes: DrawableShape[]
  removeShape: (shape: DrawableShape) => void
  toggleShapeVisibility: (shape: DrawableShape) => void
  toggleShapeLock: (shape: DrawableShape) => void
  selectedShape: DrawableShape | undefined
  selectShape: (shape: DrawableShape) => void
  moveShapes: (firstShapeId: string, lastShapeId: string) => void
  isLayoutPanelShown: boolean
}

const Layouts = ({
  withGrid,
  setWithGrid,
  disabled = false,
  shapes,
  removeShape,
  toggleShapeVisibility,
  toggleShapeLock,
  selectedShape,
  moveShapes,
  selectShape,
  isLayoutPanelShown
}: LayoutsType) => {
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)

  const onToggleGrid = () => {
    setWithGrid(prev => !prev)
  }
  return isLayoutPanelShown ? (
    <StyledPanelLayouts title="Layers" alignment="right">
      <StyledScrollingContent>
        <StyledGridButton
          title={withGrid ? 'Grid on' : 'Grid off'}
          data-grid={withGrid}
          disabled={disabled}
          onClick={onToggleGrid}
          icon={withGrid ? gridOnIcon : gridOffIcon}>
          Toggle grid
        </StyledGridButton>
        <hr />
        <StyledLayouts>
          {shapes.length === 0 ? (
            <StyledPlaceholder>No layer yet</StyledPlaceholder>
          ) : (
            _.map(
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
            )
          )}
        </StyledLayouts>
      </StyledScrollingContent>
    </StyledPanelLayouts>
  ) : null
}

export default Layouts
