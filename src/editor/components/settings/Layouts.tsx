import { type EditorState, type ShapeEntity, shallowEqual, usePaint, usePaintState } from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { type GridLabelType, GridValues } from '@editor/constants/grid'
import { gridOffIcon, lockedIcon, trashIcon, unlockedIcon, visibilityIcon, visibilityOffIcon } from '@editor/constants/icons'
import useDrag from '@editor/hooks/useDrag'
import { getShapePicture } from '@editor/utils/style'
import type React from 'react'
import { memo, useMemo, useRef, useState } from 'react'
import './Layouts.css'

/** What a layer shows of a shape: it does not change while the shape is moved */
type LayerItem = {
  id: string
  type: ShapeEntity['type']
  visible: boolean | undefined
  locked: boolean | undefined
}

type LayoutType = {
  disabled?: boolean
  shape: LayerItem
  selected: boolean
  layoutDragging: string | undefined
  setLayoutDragging: (shapeId: string | undefined) => void
  handleRemove: (ids: string[]) => void
  handleSelect: (ids: string[]) => void
  toggleShapeVisibility: (ids: string[]) => void
  toggleShapeLock: (ids: string[]) => void
  onSwapShapes: (firstShapeId: string, lastShapeId: string) => void
}

// the props are stable: only the changed layers render again
const Layout = memo(function Layout({
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
}: LayoutType) {
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
})

const getGridFormat = (gridGap: number): GridLabelType =>
  gridGap >= GridValues.large ? 'large' : gridGap >= GridValues.medium ? 'medium' : gridGap >= GridValues.small ? 'small' : 'none'

/** The layers keep their identity while their shape is only moved or resized */
const createLayersSelector = () => {
  let lastShapes: ShapeEntity[] | undefined
  let lastLayers: LayerItem[] = []
  let cache = new Map<string, LayerItem>()
  return ({ shapes }: EditorState) => {
    if (shapes === lastShapes) return lastLayers
    const layers = new Map<string, LayerItem>()
    const items = shapes.map(({ id, type, visible, locked }) => {
      const cached = cache.get(id)
      const layer = cached?.type === type && cached.visible === visible && cached.locked === locked ? cached : { id, type, visible, locked }
      layers.set(id, layer)
      return layer
    })
    cache = layers
    lastShapes = shapes
    lastLayers = items
    return items
  }
}

const selectSelectedShapeIds = (state: EditorState) => state.selectedShapeIds

const LayoutsPanel = ({ disabled }: { disabled: boolean }) => {
  const paint = usePaint()
  const { actions } = paint
  const [selectLayers] = useState(createLayersSelector)
  const layers = usePaintState(paint, selectLayers, shallowEqual)
  const selectedShapeIds = usePaintState(paint, selectSelectedShapeIds)
  const gridFormat = getGridFormat(usePaintState(paint, state => state.gridGap))
  const [layoutDragging, setLayoutDragging] = useState<string | undefined>(undefined)
  const selectedShapeIdSet = useMemo(() => new Set(selectedShapeIds), [selectedShapeIds])

  const setGridFormat = (value: GridLabelType) => actions.setGridGap(GridValues[value])

  return (
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
            {layers.length === 0 ? (
              <div className='react-paint-editor-layouts-placeholder'>No layer yet</div>
            ) : (
              layers.map(layer => (
                <Layout
                  key={layer.id}
                  shape={layer}
                  disabled={disabled}
                  layoutDragging={layoutDragging}
                  setLayoutDragging={setLayoutDragging}
                  selected={selectedShapeIdSet.has(layer.id)}
                  handleSelect={actions.selectShapes}
                  handleRemove={actions.removeShapes}
                  onSwapShapes={actions.swapShapes}
                  toggleShapeVisibility={actions.toggleShapesVisibility}
                  toggleShapeLock={actions.toggleShapesLock}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}

type LayoutsType = {
  disabled: boolean
  isLayoutPanelShown: boolean
}

/** Panel of the layers and of the grid. It only reads the state while it is shown */
const Layouts = ({ disabled, isLayoutPanelShown }: LayoutsType) => (isLayoutPanelShown ? <LayoutsPanel disabled={disabled} /> : null)

export default Layouts
