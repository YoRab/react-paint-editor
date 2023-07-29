import React, { useRef, useState } from 'react'
import _ from 'lodash/fp'
import type { DrawableShape } from 'types/Shapes'
import useDrag from 'hooks/useDrag'
import {
  gridOffIcon,
  lockedIcon,
  trashIcon,
  unlockedIcon,
  visibilityIcon,
  visibilityOffIcon
} from 'constants/icons'
import { getShapePicture } from 'utils/style'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import type { GridFormatType } from 'constants/app'
import './Layouts.css'

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
    <div
      className='react-paint-editor-layout'
      data-disabled={+disabled}
      draggable={!disabled}
      data-is-dragging={+(layoutDragging === shape.id)}
      data-is-over={+isOver}
      onClick={onSelect}
      data-selected={+selected}
      ref={ref}>
      <span dangerouslySetInnerHTML={{ __html: getShapePicture(shape.type) }} />
      <span>{shape.id}</span>
      <div className='react-paint-editor-layouts-separator' />

      <Button
        className='react-paint-editor-layouts-visible-button'
        title={shape.visible ? 'Hide' : 'Show'}
        data-visible={shape.visible !== false}
        disabled={disabled}
        selected={selected}
        onClick={onToggleShapeVisibility}
        icon={shape.visible === false ? visibilityOffIcon : visibilityIcon}
      />

      <Button
        className='react-paint-editor-layouts-locked-button'
        title={shape.locked ? 'Locked' : 'Unlocked'}
        data-locked={!!shape.locked}
        disabled={disabled}
        selected={selected}
        onClick={onToggleShapeLock}
        icon={shape.locked ? lockedIcon : unlockedIcon}
      />
      <Button className='react-paint-editor-layouts-remove-button' title="Remove" disabled={disabled} onClick={onRemove} icon={trashIcon} />
    </div>
  )
}

type LayoutsType = {
  gridFormat: GridFormatType
  setGridFormat: React.Dispatch<React.SetStateAction<GridFormatType>>
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
  gridFormat,
  setGridFormat,
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

  return isLayoutPanelShown ? (
    <Panel alignment="right" className='react-paint-editor-layouts-panel'>
      <div className='react-paint-editor-layouts-panel-content'>
        <div className='react-paint-editor-layouts-scrolling-content'>
          <div className='react-paint-editor-layouts-row'>
            <span className='react-paint-editor-layouts-subtitle'>Grid</span>
            <Button
              icon={gridOffIcon}
              className='react-paint-editor-layouts-grid-button'
              selected={gridFormat === 0}
              disabled={disabled}
              onClick={() => setGridFormat(0)}></Button>
            {['S', 'M', 'L'].map((value, index) => (
              <Button
                key={value}
                className='react-paint-editor-layouts-grid-button'
                selected={gridFormat === index + 1}
                disabled={disabled}
                onClick={() => setGridFormat((index + 1) as GridFormatType)}>
                {value}
              </Button>
            ))}
          </div>
          <hr />
          <div className='react-paint-editor-layouts'>
            {shapes.length === 0 ? (
              <div className='react-paint-editor-layouts-placeholder'>No layer yet</div>
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
          </div>
        </div>
      </div>
    </Panel>
  ) : null
}

export default Layouts
