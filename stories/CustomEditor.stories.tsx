import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { expect, userEvent, within } from 'storybook/test'
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
} from '../src/index'
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

const CustomEditor = () => {
  const paint = useReactPaint({ width: 600, height: 400 })

  return (
    <MyEditor paint={paint}>
      <Canvas paint={paint} />
    </MyEditor>
  )
}

const meta = {
  title: 'React Paint/Custom editor',
  component: CustomEditor,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof CustomEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'An editor built from scratch with the canvas handle only: `actions` to act on the canvas, `scopeRef` to set on the root element so that the keyboard shortcuts also work from the toolbar, and `usePaintState` to read the state. Each part reads only what it shows with a selector, and renders again only when it changes: the toolbar does not render while a shape is dragged. The parts get the handle with `usePaint`, under a `PaintProvider`. The editor reacts to the hovered shape (`state.interaction.hoveredShape`) and handles its own context menu (`state.contextMenu`).'
      },
      source: {
        code: `const MyToolbar = () => {
  const paint = usePaint()
  // an object built by the selector needs shallowEqual
  const { activeTool, tools, history } = usePaintState(
    paint,
    state => ({ activeTool: state.activeTool, tools: state.tools, history: state.history }),
    shallowEqual
  )

  return (
    <div>
      {tools.map(tool => (
        <button key={tool.id} aria-pressed={activeTool.id === tool.id} onClick={() => paint.actions.selectTool(tool.id)}>
          {tool.label ?? tool.type}
        </button>
      ))}
      <button disabled={!history.canUndo} onClick={paint.actions.undo}>undo</button>
    </div>
  )
}

const MyLayers = () => {
  const paint = usePaint()
  const shapes = usePaintState(paint, state => state.shapes)
  const hoveredId = usePaintState(paint, state => state.interaction.hoveredShape?.id)

  return (
    <ul>
      {shapes.map(shape => (
        <li key={shape.id} data-hovered={hoveredId === shape.id}>
          <button onClick={() => paint.actions.selectShapes([shape.id])}>{shape.type}</button>
        </li>
      ))}
    </ul>
  )
}

const MyEditor = ({ paint, children }) => (
  <PaintProvider paint={paint}>
    <div ref={paint.scopeRef}>
      <MyToolbar />
      {children}
      <MyLayers />
    </div>
  </PaintProvider>
)

const App = () => {
  const paint = useReactPaint()
  return (
    <MyEditor paint={paint}>
      <Canvas paint={paint} />
    </MyEditor>
  )
}`,
        language: 'tsx'
      }
    }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const layers = await view.findByRole('list', { name: 'Layers' })

    // --- Draw a rect with the custom toolbar ---
    await userEvent.click(await view.findByRole('button', { name: 'rect' }))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    expect(within(layers).getAllByRole('listitem')).toHaveLength(1)
    expect(within(layers).getByRole('listitem')).toHaveAttribute('data-selected', 'true')
    expect(await view.findByRole('button', { name: 'select' })).toHaveAttribute('aria-pressed', 'true')

    // --- Change its style, then undo ---
    await userEvent.click(await view.findByRole('button', { name: 'red' }))
    expect(within(layers).getByRole('listitem')).toHaveTextContent('rect - red')
    await userEvent.click(await view.findByRole('button', { name: 'undo' }))
    expect(within(layers).getByRole('listitem')).toHaveTextContent('rect - black')

    // --- The editor reacts to the hovered shape ---
    await user.pointer({ target: drawCanvas, coords: { x: cx + 10, y: cy + 10 } })
    await new Promise(res => setTimeout(res, 100))
    expect(within(layers).getByRole('listitem')).toHaveAttribute('data-hovered', 'true')

    // --- Custom context menu ---
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: cx + 10, y: cy + 10 } })
    await userEvent.click(await view.findByRole('menuitem', { name: 'duplicate' }))
    await new Promise(res => setTimeout(res, 100))
    expect(within(layers).getAllByRole('listitem')).toHaveLength(2)
    expect(view.queryByRole('menu')).toBeNull()
  }
}
