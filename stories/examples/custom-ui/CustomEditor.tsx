import type { ReactNode } from 'react'
import {
  Canvas,
  getSelectedShapesTools,
  PaintProvider,
  type ReactPaint,
  SELECTION_TOOL,
  shallowEqual,
  usePaint,
  usePaintState,
  useReactPaint
} from '../../../src/index'
import './customEditor.css'

// Each part of the editor reads only what it shows, and renders again only when it changes

const MyToolbar = () => {
  const paint = usePaint()
  const { actions } = paint
  const { activeTool, tools, history } = usePaintState(
    paint,
    state => ({ activeTool: state.activeTool, tools: state.tools, history: state.history }),
    shallowEqual
  )
  const selectedIds = usePaintState(paint, state => state.selectedShapeIds)

  return (
    <div className='custom-editor-toolbar' role='toolbar'>
      <button type='button' aria-pressed={activeTool.id === SELECTION_TOOL.id} onClick={() => actions.selectTool(SELECTION_TOOL.id)}>
        select
      </button>
      {tools
        .filter(tool => tool.type !== 'picture')
        .map(tool => (
          <button key={tool.id} type='button' aria-pressed={activeTool.id === tool.id} onClick={() => actions.selectTool(tool.id)}>
            {tool.label ?? tool.type}
          </button>
        ))}
      <button type='button' disabled={!history.canUndo} onClick={actions.undo}>
        undo
      </button>
      <button type='button' disabled={!history.canRedo} onClick={actions.redo}>
        redo
      </button>
      <button type='button' disabled={!selectedIds.length} onClick={() => actions.removeShapes(selectedIds)}>
        delete
      </button>
    </div>
  )
}

const MyStrokeColors = () => {
  const paint = usePaint()
  const selectedIds = usePaintState(paint, state => state.selectedShapeIds)
  const strokeColors = usePaintState(paint, state => {
    const selectionTool = getSelectedShapesTools(state.selection, state.tools)
    return selectionTool && 'strokeColor' in selectionTool.settings ? selectionTool.settings.strokeColor?.values : undefined
  })

  return strokeColors ? (
    <fieldset>
      <legend>Stroke color</legend>
      {strokeColors.map(color => (
        <button
          key={color}
          type='button'
          aria-label={color}
          className='custom-editor-color'
          style={{ background: color }}
          onClick={() => paint.actions.updateShapesStyle(selectedIds, 'strokeColor', color)}
        />
      ))}
    </fieldset>
  ) : null
}

const MyLayers = () => {
  const paint = usePaint()
  const shapes = usePaintState(paint, state => state.shapes)
  const selectedIds = usePaintState(paint, state => state.selectedShapeIds)
  // reacts to the hovered shape
  const hoveredId = usePaintState(paint, state => state.interaction.hoveredShape?.id)

  return (
    <ul aria-label='Layers'>
      {shapes.map(shape => (
        <li key={shape.id} data-selected={selectedIds.includes(shape.id)} data-hovered={hoveredId === shape.id}>
          <button type='button' onClick={() => paint.actions.selectShapes([shape.id])}>
            {shape.type} - {shape.style?.strokeColor}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Context menu of the editor, opened by a right click on the canvas */
const MyContextMenu = () => {
  const paint = usePaint()
  const contextMenu = usePaintState(paint, state => state.contextMenu)
  if (!contextMenu) return null
  const contextMenuIds = contextMenu.shapes.map(shape => shape.id)

  return (
    <div role='menu' className='custom-editor-context-menu' style={{ left: contextMenu.clientPosition.x, top: contextMenu.clientPosition.y }}>
      <button
        type='button'
        role='menuitem'
        onClick={() => {
          paint.actions.duplicateShapes(contextMenuIds, { translate: true, select: true })
          paint.actions.closeContextMenu()
        }}
      >
        duplicate
      </button>
      <button type='button' role='menuitem' onClick={paint.actions.closeContextMenu}>
        close
      </button>
    </div>
  )
}

/** A minimal editor, built only with the canvas handle: it does not use any component of the library editor */
const MyEditor = ({ paint, children }: { paint: ReactPaint; children: ReactNode }) => (
  <PaintProvider paint={paint}>
    <div ref={paint.scopeRef} className='custom-editor'>
      <MyToolbar />
      <div className='custom-editor-content'>
        {children}
        <div className='custom-editor-side'>
          <MyStrokeColors />
          <MyLayers />
        </div>
      </div>
      <MyContextMenu />
    </div>
  </PaintProvider>
)

export const CustomEditor = () => {
  const paint = useReactPaint({ width: 600, height: 400 })

  return (
    <MyEditor paint={paint}>
      <Canvas paint={paint} />
    </MyEditor>
  )
}
