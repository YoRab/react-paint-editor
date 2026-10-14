import type { ShapeEntity } from '@common/types/Shapes'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import type { GridLabelType } from '@editor/constants/grid'
import { gridOffIcon, lockedIcon, trashIcon, unlockedIcon, visibilityIcon, visibilityOffIcon } from '@editor/constants/icons'
import useDrag from '@editor/hooks/useDrag'
import { getShapePicture } from '@editor/utils/style'
import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import './Layouts.css'

type LayoutType = {
  disabled?: boolean
  shape: ShapeEntity
  selected: boolean
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleRemove: (ids: string[]) => void
  handleSelect: (ids: string[]) => void
  toggleShapeVisibility: (ids: string[]) => void
  toggleShapeLock: (ids: string[]) => void
  onSwapShapes: (firstShapeId: string, lastShapeId: string) => void
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
  onSwapShapes
}: LayoutType) => {
  const ref = useRef<HTMLDivElement>(null)

  const onRemove = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    handleRemove([shape.id])
  }

  const onSelect = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    handleSelect([shape.id])
  }

  const onToggleShapeVisibility = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    toggleShapeVisibility([shape.id])
  }

  const onToggleShapeLock = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    toggleShapeLock([shape.id])
  }

  const { isOver } = useDrag({
    disabled,
    ref,
    shape,
    layoutDragging,
    setLayoutDragging,
    handleSelect,
    onSwapShapes
  })

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: need to find a proper role or to use a button
    <div
      className='react-paint-editor-layout'
      data-disabled={+disabled}
      draggable={!disabled}
      data-is-dragging={+(layoutDragging === shape.id)}
      data-is-over={+isOver}
      onClick={onSelect}
      data-selected={+selected}
      ref={ref}
      tabIndex={-1}
    >
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
      <Button className='react-paint-editor-layouts-remove-button' title='Remove' disabled={disabled} onClick={onRemove} icon={trashIcon} />
    </div>
  )
}

type LayoutsType = {
  gridFormat: GridLabelType
  setGridFormat: (value: GridLabelType) => void
  disabled: boolean
  shapes: ShapeEntity[]
  removeShapes: (ids: string[]) => void
  toggleShapeVisibility: (ids: string[]) => void
  toggleShapeLock: (ids: string[]) => void
  selectedShapeIds: string[]
  selectShapes: (ids: string[]) => void
  swapShapes: (startPositionShapeId: string, endPositionShapeId: string) => void
  isLayoutPanelShown: boolean
}

const Layouts = ({
  gridFormat,
  setGridFormat,
  disabled,
  shapes,
  removeShapes,
  toggleShapeVisibility,
  toggleShapeLock,
  selectedShapeIds,
  swapShapes,
  selectShapes,
  isLayoutPanelShown
}: LayoutsType) => {
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)
  const selectedShapeIdSet = useMemo(() => new Set(selectedShapeIds), [selectedShapeIds])

  return isLayoutPanelShown ? (
    <Panel alignment='right' className='react-paint-editor-layouts-panel' position='bottom'>
      <div className='react-paint-editor-layouts-panel-content'>
        <div className='react-paint-editor-layouts-scrolling-content'>
          <div className='react-paint-editor-layouts-row'>
            <span className='react-paint-editor-layouts-subtitle'>Grid</span>
            <Button
              aria-label='No grid'
              icon={gridOffIcon}
              className='react-paint-editor-layouts-grid-button'
              selected={gridFormat === 'none'}
              disabled={disabled}
              onClick={() => setGridFormat('none')}
            />
            {(['small', 'medium', 'large'] as const).map(value => (
              <Button
                key={value}
                className='react-paint-editor-layouts-grid-button'
                selected={gridFormat === value}
                disabled={disabled}
                onClick={() => setGridFormat(value)}
              >
                {value.charAt(0).toUpperCase()}
              </Button>
            ))}
          </div>
          <hr />
          <div className='react-paint-editor-layouts'>
            {shapes.length === 0 ? (
              <div className='react-paint-editor-layouts-placeholder'>No layer yet</div>
            ) : (
              shapes.map(shape => (
                <Layout
                  key={shape.id}
                  shape={shape}
                  disabled={disabled}
                  layoutDragging={layoutDragging}
                  setLayoutDragging={setLayoutDragging}
                  selected={selectedShapeIdSet.has(shape.id)}
                  handleSelect={selectShapes}
                  handleRemove={removeShapes}
                  onSwapShapes={swapShapes}
                  toggleShapeVisibility={toggleShapeVisibility}
                  toggleShapeLock={toggleShapeLock}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Panel>
  ) : null
}

export default Layouts
