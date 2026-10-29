import {
  canGroupShapes,
  type EditorActions,
  type EditorState,
  GRID_PRESETS,
  type ShapeEntity,
  shallowEqual,
  usePaint,
  usePaintState
} from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import {
  gridOffIcon,
  groupShapesIcon,
  lockedIcon,
  rightChevronIcon,
  trashIcon,
  ungroupShapesIcon,
  unlockedIcon,
  visibilityIcon,
  visibilityOffIcon
} from '@editor/constants/icons'
import useDrag, { type DraggedLayer } from '@editor/hooks/useDrag'
import { buildLayers, getLayerAncestorIds, getShownLayers, type LayerItem } from '@editor/utils/layers'
import { getShapePicture } from '@editor/utils/style'
import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './Layouts.css'

type GridLabelType = keyof typeof GRID_PRESETS

type LayoutNameInputType = {
  name: string | undefined
  /** Called once, with the name typed, or without it when the edition is cancelled */
  finishRenaming: (name?: string) => void
}

/** Field of the name of a group: Enter or the loss of the focus renames the group, Escape cancels */
const LayoutNameInput = ({ name, finishRenaming }: LayoutNameInputType) => {
  const ref = useRef<HTMLInputElement>(null)
  // the field also loses the focus when the edition is done
  const isDone = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const finish = (newName?: string) => {
    if (isDone.current) return
    isDone.current = true
    finishRenaming(newName)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    const field = e.currentTarget
    finish(e.key === 'Enter' ? field.value : undefined)
    // the layer takes the focus back before the field is removed: the shortcuts are still received
    field.parentElement?.focus()
  }

  return (
    <input
      ref={ref}
      className='react-paint-editor-layout-name'
      aria-label='Group name'
      defaultValue={name ?? ''}
      onKeyDown={onKeyDown}
      onBlur={e => finish(e.currentTarget.value)}
      // the clicks in the field do not select the group again
      onClick={e => e.stopPropagation()}
    />
  )
}

type LayoutType = {
  disabled?: boolean
  shape: LayerItem
  selected: boolean
  collapsed: boolean
  layoutDragging: DraggedLayer | undefined
  setLayoutDragging: (layer: DraggedLayer | undefined) => void
  handleRemove: (ids: string[]) => void
  handleSelect: EditorActions['selectShapes']
  handleUpdate: EditorActions['updateShapes']
  toggleCollapsed: (id: string) => void
  toggleShapeVisibility: (ids: string[]) => void
  toggleShapeLock: (ids: string[]) => void
  onSwapShapes: (firstShapeId: string, lastShapeId: string) => void
}

// the props are stable: only the changed layers render again
const Layout = memo(function Layout({
  disabled = false,
  shape,
  selected,
  collapsed,
  layoutDragging,
  toggleShapeVisibility,
  toggleShapeLock,
  setLayoutDragging,
  handleRemove,
  handleSelect,
  handleUpdate,
  toggleCollapsed,
  onSwapShapes
}: LayoutType) {
  const ref = useRef<HTMLDivElement>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const isGroup = shape.type === 'group'

  const onRemove = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    handleRemove([shape.id])
  }

  const onSelect = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return
    e.preventDefault()
    // like Shift on the canvas, Shift, Ctrl or Cmd adds the shape to the selection, or removes it
    const isToggle = e.shiftKey || e.ctrlKey || e.metaKey
    handleSelect([shape.id], isToggle ? { mode: selected ? 'remove' : 'add' } : undefined)
  }

  // the buttons of the layer, clicked twice, do not rename it
  const onStartRenaming = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled || !isGroup || (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    setIsRenaming(true)
  }

  // an empty name removes the name of the group, which shows its id again
  const finishRenaming = (newName?: string) => {
    setIsRenaming(false)
    if (newName === undefined) return
    const name = newName.trim() ? newName : undefined
    if (name !== shape.name) handleUpdate([{ id: shape.id, name }])
  }

  const onToggleCollapsed = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    toggleCollapsed(shape.id)
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

  // the text of the name is selected with the mouse, instead of the layer being dragged
  const isDraggable = !disabled && !isRenaming
  const { isOver } = useDrag({
    disabled: !isDraggable,
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
      draggable={isDraggable}
      data-is-dragging={+(layoutDragging?.id === shape.id)}
      data-is-over={+isOver}
      onClick={onSelect}
      onDoubleClick={onStartRenaming}
      data-selected={+selected}
      ref={ref}
      tabIndex={-1}
      style={{ '--react-paint-editor-layout-depth': shape.depth } as React.CSSProperties}
    >
      {isGroup ? (
        <Button
          className='react-paint-editor-layout-chevron'
          title={collapsed ? 'Expand' : 'Collapse'}
          aria-expanded={!collapsed}
          selected={selected}
          onClick={onToggleCollapsed}
          icon={rightChevronIcon}
        />
      ) : (
        <span className='react-paint-editor-layout-chevron-space' />
      )}
      <span dangerouslySetInnerHTML={{ __html: getShapePicture(shape.type) }} />
      {isRenaming ? <LayoutNameInput name={shape.name} finishRenaming={finishRenaming} /> : <span>{shape.name ?? shape.id}</span>}
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
  gridGap >= GRID_PRESETS.large ? 'large' : gridGap >= GRID_PRESETS.medium ? 'medium' : gridGap >= GRID_PRESETS.small ? 'small' : 'none'

/** The layers keep their identity while their shape is only moved or resized */
const createLayersSelector = () => {
  let lastShapes: ShapeEntity[] | undefined
  let lastLayers: LayerItem[] = []
  return ({ shapes }: EditorState) => {
    if (shapes === lastShapes) return lastLayers
    lastLayers = buildLayers(shapes, new Map(lastLayers.map(layer => [layer.id, layer])))
    lastShapes = shapes
    return lastLayers
  }
}

const selectSelectedShapeIds = (state: EditorState) => state.selectedShapeIds

type GroupActions = { canGroup: boolean; canUngroup: boolean }

/** Whether the selected shapes can be grouped, or hold groups to ungroup: computed again when the shapes change */
const createGroupActionsSelector = () => {
  let last: { shapes: ShapeEntity[]; selectedShapes: ShapeEntity[]; actions: GroupActions } | undefined
  return ({ shapes, selectedShapes }: EditorState): GroupActions => {
    if (last?.shapes !== shapes || last.selectedShapes !== selectedShapes) {
      const actions = { canGroup: canGroupShapes(shapes, selectedShapes), canUngroup: selectedShapes.some(shape => shape.type === 'group') }
      last = { shapes, selectedShapes, actions }
    }
    return last.actions
  }
}

const LayoutsPanel = ({ disabled }: { disabled: boolean }) => {
  const paint = usePaint()
  const { actions } = paint
  const [selectLayers] = useState(createLayersSelector)
  const layers = usePaintState(paint, selectLayers, shallowEqual)
  const selectedShapeIds = usePaintState(paint, selectSelectedShapeIds)
  const [selectGroupActions] = useState(createGroupActionsSelector)
  const { canGroup, canUngroup } = usePaintState(paint, selectGroupActions, shallowEqual)
  const gridFormat = getGridFormat(usePaintState(paint, state => state.gridGap))
  const [layoutDragging, setLayoutDragging] = useState<DraggedLayer | undefined>(undefined)
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [shownSelection, setShownSelection] = useState(selectedShapeIds)
  const selectedShapeIdSet = useMemo(() => new Set(selectedShapeIds), [selectedShapeIds])

  // the groups holding the shapes newly selected are expanded, to show them
  if (shownSelection !== selectedShapeIds) {
    setShownSelection(selectedShapeIds)
    const ancestorIds = getLayerAncestorIds(layers, selectedShapeIds)
    if ([...collapsedIds].some(id => ancestorIds.has(id))) setCollapsedIds(new Set([...collapsedIds].filter(id => !ancestorIds.has(id))))
  }

  const toggleCollapsed = useCallback(
    (id: string) =>
      setCollapsedIds(previous => {
        const next = new Set(previous)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    []
  )

  const shownLayers = useMemo(() => getShownLayers(layers, collapsedIds), [layers, collapsedIds])
  const hasGroups = layers.some(layer => layer.type === 'group')

  const setGridFormat = (value: GridLabelType) => actions.setGridGap(GRID_PRESETS[value])

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
          <div className='react-paint-editor-layouts-row'>
            <span className='react-paint-editor-layouts-subtitle'>Layers</span>
            <Button
              title='Group shapes'
              icon={groupShapesIcon}
              disabled={disabled || !canGroup}
              onClick={() => actions.groupShapes(selectedShapeIds)}
            />
            <Button
              title='Ungroup shapes'
              icon={ungroupShapesIcon}
              disabled={disabled || !canUngroup}
              onClick={() => actions.ungroupShapes(selectedShapeIds)}
            />
          </div>
          <div className='react-paint-editor-layouts' data-with-groups={+hasGroups}>
            {layers.length === 0 ? (
              <div className='react-paint-editor-layouts-placeholder'>No layer yet</div>
            ) : (
              shownLayers.map(layer => (
                <Layout
                  key={layer.id}
                  shape={layer}
                  disabled={disabled}
                  collapsed={collapsedIds.has(layer.id)}
                  layoutDragging={layoutDragging}
                  setLayoutDragging={setLayoutDragging}
                  selected={selectedShapeIdSet.has(layer.id)}
                  handleSelect={actions.selectShapes}
                  handleRemove={actions.removeShapes}
                  handleUpdate={actions.updateShapes}
                  toggleCollapsed={toggleCollapsed}
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
