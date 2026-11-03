import {
  canGroupShapes,
  type EditorActions,
  type EditorState,
  GRID_PRESETS,
  type ReactPaint,
  type ShapeEntity,
  type ShapesOrderAction,
  shallowEqual,
  usePaint,
  usePaintState
} from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import {
  arrowDownwardIcon,
  arrowUpwardIcon,
  dragHandleIcon,
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
import useArrowNavigation from '@editor/hooks/useArrowNavigation'
import useEscape from '@editor/hooks/useEscape'
import useLayerDrag from '@editor/hooks/useLayerDrag'
import { mergeRefs } from '@editor/utils/dom'
import { buildLayers, getLayerAncestorIds, getLayerMoveMessage, getPaintShapeNames, getShownLayers, type LayerItem } from '@editor/utils/layers'
import { getShapePicture, getToolIcon } from '@editor/utils/style'
import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './Layouts.css'

type GridLabelType = keyof typeof GRID_PRESETS

type LayoutNameInputType = {
  name: string | undefined
  /** Called once, with the name typed, or without it when the edition is cancelled */
  finishRenaming: (name?: string) => void
}

/** Field of the name of a shape: Enter or the loss of the focus renames the shape, Escape cancels */
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

  // the layer takes the focus back before the field is removed: the shortcuts are still received
  const finishFromKeyboard = (newName?: string) => {
    finish(newName)
    ref.current?.parentElement?.focus()
  }

  // Escape cancels the edition, before the panel holding the field gives the focus back to its button
  useEscape(
    () => [ref.current],
    () => finishFromKeyboard()
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    finishFromKeyboard(e.currentTarget.value)
  }

  return (
    <input
      ref={ref}
      className='react-paint-editor-layout-name'
      aria-label='Layer name'
      defaultValue={name ?? ''}
      onKeyDown={onKeyDown}
      onBlur={e => finish(e.currentTarget.value)}
      // the clicks in the field do not select the shape again
      onClick={e => e.stopPropagation()}
    />
  )
}

type LayoutType = {
  disabled?: boolean
  shape: LayerItem
  icon: React.ReactNode
  selected: boolean
  collapsed: boolean
  /** Whether the name of the layer is being typed */
  isRenaming: boolean
  setRenamingId: (id: string | undefined) => void
  /** Gives the focus to the button of a layer, once it is shown again */
  focusLayer: (id: string) => void
  /** Moves the shape among the shapes of its group, then gives the focus back to the element of the selector in its layer */
  moveLayer: (id: string, action: ShapesOrderAction, focusSelector?: string) => void
  handleRemove: (ids: string[]) => void
  handleSelect: EditorActions['selectShapes']
  handleUpdate: EditorActions['updateShapes']
  toggleCollapsed: (id: string) => void
  toggleShapeVisibility: (ids: string[]) => void
  toggleShapeLock: (ids: string[]) => void
}

// the props are stable: only the changed layers render again
const Layout = memo(function Layout({
  disabled = false,
  shape,
  icon,
  selected,
  collapsed,
  isRenaming,
  setRenamingId,
  focusLayer,
  moveLayer,
  toggleShapeVisibility,
  toggleShapeLock,
  handleRemove,
  handleSelect,
  handleUpdate,
  toggleCollapsed
}: LayoutType) {
  const isGroup = shape.type === 'group'

  // the clicks of the buttons of the layer do not select it. A disabled button is not clicked
  const onButtonClick = (action: () => void) => (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    action()
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
    if (disabled || (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    setRenamingId(shape.id)
  }

  // an empty name removes the name of the shape, which shows its default name again
  const finishRenaming = (newName?: string) => {
    setRenamingId(undefined)
    focusLayer(shape.id)
    if (newName === undefined) return
    const name = newName.trim() ? newName : undefined
    if (name !== shape.name) handleUpdate([{ id: shape.id, name }])
  }

  // the button keeps the focus once its layer is moved, see moveLayer
  const onMove = (action: 'forward' | 'backward') => onButtonClick(() => moveLayer(shape.id, action, `[data-move="${action}"]`))

  const iconSpan = (
    <span className='react-paint-editor-layout-icon' aria-hidden='true'>
      {icon}
    </span>
  )

  return (
    // the clicks of the row are the ones of its select button, given to the whole row. The row is dragged by its handle,
    // or with the mouse from anywhere outside of its buttons, see useLayerDrag
    <li
      className='react-paint-editor-layout'
      data-layer-id={shape.id}
      data-disabled={+disabled}
      onClick={onSelect}
      onDoubleClick={onStartRenaming}
      data-selected={+selected}
      tabIndex={-1}
      style={{ '--react-paint-editor-layout-depth': shape.depth } as React.CSSProperties}
    >
      {/* the pointer only: the keyboard and the assistive technologies move the layer with its buttons, or Alt and the arrows */}
      <span className='react-paint-editor-layout-handle' aria-hidden='true' title='Drag to reorder'>
        {dragHandleIcon}
      </span>
      {isGroup ? (
        // out of the order of Tab: ArrowRight and ArrowLeft expand and collapse the group, see handleLayerKeyDown
        <Button
          className='react-paint-editor-layout-chevron'
          title={collapsed ? 'Expand' : 'Collapse'}
          tabIndex={-1}
          aria-expanded={!collapsed}
          selected={selected}
          onClick={onButtonClick(() => toggleCollapsed(shape.id))}
          icon={rightChevronIcon}
        />
      ) : (
        <span className='react-paint-editor-layout-chevron-space' />
      )}
      {isRenaming ? (
        <>
          {iconSpan}
          <LayoutNameInput name={shape.name ?? shape.label} finishRenaming={finishRenaming} />
        </>
      ) : (
        // a span, from the time of the native drag, which a button did not start in Firefox: its keys are handled by the
        // panel, see handleLayerKeyDown. The list gives Tab to a single layer, see useArrowNavigation
        // biome-ignore lint/a11y/useSemanticElements: the keys of the span are the ones of a button
        <span
          className='react-paint-editor-layout-select'
          role='button'
          tabIndex={-1}
          aria-pressed={selected}
          aria-disabled={disabled}
          data-layer-id={shape.id}
        >
          {iconSpan}
          <span className='react-paint-editor-layout-label'>{shape.label}</span>
        </span>
      )}

      <Button
        className='react-paint-editor-layouts-move-button'
        title='Move forward'
        data-move='forward'
        disabled={disabled || shape.isFirst}
        selected={selected}
        onClick={onMove('forward')}
        icon={arrowUpwardIcon}
      />
      <Button
        className='react-paint-editor-layouts-move-button'
        title='Move backward'
        data-move='backward'
        disabled={disabled || shape.isLast}
        selected={selected}
        onClick={onMove('backward')}
        icon={arrowDownwardIcon}
      />

      <Button
        className='react-paint-editor-layouts-visible-button'
        title={shape.visible !== false ? 'Hide' : 'Show'}
        data-visible={shape.visible !== false}
        disabled={disabled}
        selected={selected}
        onClick={onButtonClick(() => toggleShapeVisibility([shape.id]))}
        icon={shape.visible === false ? visibilityOffIcon : visibilityIcon}
      />

      <Button
        className='react-paint-editor-layouts-locked-button'
        title={shape.locked ? 'Locked' : 'Unlocked'}
        data-locked={!!shape.locked}
        disabled={disabled}
        selected={selected}
        onClick={onButtonClick(() => toggleShapeLock([shape.id]))}
        icon={shape.locked ? lockedIcon : unlockedIcon}
      />
      <Button
        className='react-paint-editor-layouts-remove-button'
        title='Remove'
        disabled={disabled}
        onClick={onButtonClick(() => handleRemove([shape.id]))}
        icon={trashIcon}
      />
    </li>
  )
})

const GRID_LABELS = { small: 'Small grid', medium: 'Medium grid', large: 'Large grid' }

const getGridFormat = (gridGap: number): GridLabelType =>
  gridGap >= GRID_PRESETS.large ? 'large' : gridGap >= GRID_PRESETS.medium ? 'medium' : gridGap >= GRID_PRESETS.small ? 'small' : 'none'

/** The layers keep their identity while their shape is only moved or resized, and their names while it is reordered */
const createLayersSelector = (paint: ReactPaint) => {
  let lastShapes: ShapeEntity[] | undefined
  let lastTools: EditorState['tools'] | undefined
  let lastLayers: LayerItem[] = []
  return ({ shapes, tools }: EditorState) => {
    if (shapes === lastShapes && tools === lastTools) return lastLayers
    lastLayers = buildLayers(shapes, new Map(lastLayers.map(layer => [layer.id, layer])), getPaintShapeNames(paint, shapes, tools))
    lastShapes = shapes
    lastTools = tools
    return lastLayers
  }
}

const selectSelectedShapeIds = (state: EditorState) => state.selectedShapeIds

const selectTools = (state: EditorState) => state.tools

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

type LayoutsPanelType = {
  disabled: boolean
  /** Id of the panel, which its button controls */
  id?: string | undefined
  panelRef?: React.Ref<HTMLDivElement>
}

const LayoutsPanel = ({ disabled, id, panelRef }: LayoutsPanelType) => {
  const paint = usePaint()
  const { actions } = paint
  const [selectLayers] = useState(() => createLayersSelector(paint))
  const layers = usePaintState(paint, selectLayers, shallowEqual)
  const selectedShapeIds = usePaintState(paint, selectSelectedShapeIds)
  const [selectGroupActions] = useState(createGroupActionsSelector)
  const { canGroup, canUngroup } = usePaintState(paint, selectGroupActions, shallowEqual)
  const gridFormat = getGridFormat(usePaintState(paint, state => state.gridGap))
  const [announcement, setAnnouncement] = useState('')
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [renamingId, setRenamingId] = useState<string | undefined>(undefined)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [shownSelection, setShownSelection] = useState(selectedShapeIds)
  const selectedShapeIdSet = useMemo(() => new Set(selectedShapeIds), [selectedShapeIds])
  const tools = usePaintState(paint, selectTools)
  const toolsById = useMemo(() => new Map(tools.map(tool => [tool.id, { type: tool.type, icon: getToolIcon(tool) }])), [tools])

  // a layer shows the icon of the tool which drew its shape, as in the toolbar, or else the one of the type of its shape
  const getLayerIcon = (layer: LayerItem) => {
    const tool = layer.toolId === undefined ? undefined : toolsById.get(layer.toolId)
    return tool?.type === layer.type ? tool.icon : getShapePicture(layer.type)
  }

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

  // The layer moved or renamed is rendered again, and loses the focus: the element of the selector in the layer takes it
  // once rendered, else the button of the layer, when the element is disabled. A focus taken elsewhere meanwhile, like by
  // a click on the canvas ending a renaming, stays there
  const focusLayer = useCallback((id: string, selector?: string) => {
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (active && active !== document.body && !listRef.current?.contains(active)) return
      const row = listRef.current?.querySelector<HTMLElement>(`.react-paint-editor-layout[data-layer-id="${CSS.escape(id)}"]`)
      const element = selector ? row?.querySelector<HTMLElement>(selector) : undefined
      const target = element && !element.matches(':disabled') ? element : row?.querySelector<HTMLElement>('.react-paint-editor-layout-select')
      target?.focus()
    })
  }, [])

  // the new place of the shape is read by the assistive technologies: the same message is announced again, changed by a
  // space which is not read
  const announceMove = useCallback(
    (id: string) => {
      const { shapes, tools } = paint.getState()
      const message = getLayerMoveMessage(shapes, id, getPaintShapeNames(paint, shapes, tools))
      setAnnouncement(previous => (previous === message ? `${message} ` : message))
    },
    [paint]
  )

  const moveLayer = useCallback(
    (id: string, action: ShapesOrderAction, focusSelector?: string) => {
      actions.moveShapes([id], action)
      announceMove(id)
      focusLayer(id, focusSelector)
    },
    [actions, announceMove, focusLayer]
  )

  const dragLayerRef = useLayerDrag({
    layers: shownLayers,
    disabled,
    // like before a drag on the canvas, the layer dragged is selected alone
    onStart: layerId => actions.selectShapes([layerId]),
    onDrop: (layerId, index) => {
      actions.setShapeIndex(layerId, index)
      announceMove(layerId)
    }
  })

  // Keys of the select buttons of the layers, besides the arrows going through them. They are prevented, so that the
  // shortcuts of the canvas leave them
  const handleLayerKeyDown = (e: KeyboardEvent, button: HTMLElement | undefined) => {
    const id = button?.dataset.layerId
    if (!button || !id || disabled) return
    // like on the canvas, Alt is read from the keys pressed in the scope
    const { alt } = paint.getState().interaction.modifiers
    switch (e.key) {
      case 'Enter':
      case ' ':
        button.click()
        break
      case 'ArrowUp':
      case 'ArrowDown':
        // the arrows alone move between the layers
        if (!alt) return
        // towards the foreground, at the top of the layers, or towards the background
        moveLayer(id, e.key === 'ArrowUp' ? 'forward' : 'backward')
        break
      case 'Home':
      case 'End':
        // Home and End alone go to the first and the last layers
        if (!alt) return
        moveLayer(id, e.key === 'Home' ? 'first' : 'last')
        break
      case 'ArrowRight':
      case 'ArrowLeft': {
        // like a sub menu, ArrowRight opens a group and ArrowLeft closes it
        const isGroup = shownLayers.some(layer => layer.id === id && layer.type === 'group')
        if (isGroup && collapsedIds.has(id) === (e.key === 'ArrowRight')) toggleCollapsed(id)
        break
      }
      case 'F2':
        setRenamingId(id)
        break
      case 'Delete':
      case 'Backspace': {
        const buttons = [...(listRef.current?.querySelectorAll<HTMLElement>('.react-paint-editor-layout-select') ?? [])]
        const index = buttons.indexOf(button)
        const next = buttons[index + 1] ?? buttons[index - 1]
        actions.removeShapes([id])
        if (next?.dataset.layerId) focusLayer(next.dataset.layerId)
        break
      }
      default:
        return
    }
    e.preventDefault()
  }

  // a single layer takes Tab, with its buttons: the arrows go through the layers
  const listNavigationRef = useArrowNavigation({
    orientation: 'vertical',
    items: '.react-paint-editor-layout-select',
    rows: '.react-paint-editor-layout',
    onKeyDown: handleLayerKeyDown
  })
  const setListRefs = useMemo(() => mergeRefs<HTMLUListElement>(listRef, listNavigationRef, dragLayerRef), [listNavigationRef, dragLayerRef])
  const gridNavigationRef = useArrowNavigation()

  return (
    <Panel
      alignment='right'
      className='react-paint-editor-layouts-panel react-paint-editor-layers-panel'
      position='bottom'
      id={id}
      panelRef={panelRef}
    >
      <div className='react-paint-editor-layouts-panel-content'>
        <div className='react-paint-editor-layouts-scrolling-content'>
          <div className='react-paint-editor-layouts-row' ref={gridNavigationRef}>
            <span className='react-paint-editor-layouts-subtitle'>Grid</span>
            <Button
              title='No grid'
              icon={gridOffIcon}
              className='react-paint-editor-layouts-grid-button'
              pressed={gridFormat === 'none'}
              disabled={disabled}
              onClick={() => setGridFormat('none')}
            />
            {(['small', 'medium', 'large'] as const).map(value => (
              <Button
                key={value}
                className='react-paint-editor-layouts-grid-button'
                title={GRID_LABELS[value]}
                aria-label={`${value.charAt(0).toUpperCase()}, ${GRID_LABELS[value]}`}
                pressed={gridFormat === value}
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
              <ul className='react-paint-editor-layouts-list' aria-label='Layers' ref={setListRefs}>
                {shownLayers.map(layer => (
                  <Layout
                    key={layer.id}
                    shape={layer}
                    icon={getLayerIcon(layer)}
                    disabled={disabled}
                    collapsed={collapsedIds.has(layer.id)}
                    isRenaming={renamingId === layer.id}
                    setRenamingId={setRenamingId}
                    focusLayer={focusLayer}
                    moveLayer={moveLayer}
                    selected={selectedShapeIdSet.has(layer.id)}
                    handleSelect={actions.selectShapes}
                    handleRemove={actions.removeShapes}
                    handleUpdate={actions.updateShapes}
                    toggleCollapsed={toggleCollapsed}
                    toggleShapeVisibility={actions.toggleShapesVisibility}
                    toggleShapeLock={actions.toggleShapesLock}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className='react-paint-editor-sr-only' role='status'>
        {announcement}
      </div>
    </Panel>
  )
}

type LayoutsType = LayoutsPanelType & {
  isLayoutPanelShown: boolean
}

/** Panel of the layers and of the grid. It only reads the state while it is shown */
const Layouts = ({ isLayoutPanelShown, ...props }: LayoutsType) => (isLayoutPanelShown ? <LayoutsPanel {...props} /> : null)

export default Layouts
