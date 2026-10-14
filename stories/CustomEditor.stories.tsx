import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, type EditorProps, getSelectedShapesTools, SELECTION_TOOL, useReactPaint } from '../src/index'
import './customEditor.css'

/** A minimal editor, built only with editorProps: it does not use any component of the library editor */
const MyEditor = ({ editorProps, children }: { editorProps: EditorProps; children: ReactNode }) => {
  const { state, actions, editorRef } = editorProps
  const selectedIds = state.selectedShapes.map(shape => shape.id)
  const selectionTool = getSelectedShapesTools(state.selection, state.tools)
  const strokeColors = selectionTool && 'strokeColor' in selectionTool.settings ? selectionTool.settings.strokeColor?.values : undefined
  const contextMenuIds = state.contextMenu?.shapes.map(shape => shape.id) ?? []

  return (
    <div ref={editorRef} className='custom-editor'>
      <div className='custom-editor-toolbar' role='toolbar'>
        <button type='button' aria-pressed={state.activeTool.id === SELECTION_TOOL.id} onClick={() => actions.selectTool(SELECTION_TOOL.id)}>
          select
        </button>
        {state.tools
          .filter(tool => tool.type !== 'picture')
          .map(tool => (
            <button key={tool.id} type='button' aria-pressed={state.activeTool.id === tool.id} onClick={() => actions.selectTool(tool.id)}>
              {tool.label ?? tool.type}
            </button>
          ))}
        <button type='button' disabled={!state.history.canUndo} onClick={actions.undo}>
          undo
        </button>
        <button type='button' disabled={!state.history.canRedo} onClick={actions.redo}>
          redo
        </button>
        <button type='button' disabled={!selectedIds.length} onClick={() => actions.removeShapes(selectedIds)}>
          delete
        </button>
      </div>
      <div className='custom-editor-content'>
        {children}
        <div className='custom-editor-side'>
          {strokeColors && (
            <fieldset>
              <legend>Stroke color</legend>
              {strokeColors.map(color => (
                <button
                  key={color}
                  type='button'
                  aria-label={color}
                  className='custom-editor-color'
                  style={{ background: color }}
                  onClick={() => actions.updateShapesStyle(selectedIds, 'strokeColor', color)}
                />
              ))}
            </fieldset>
          )}
          <ul aria-label='Layers'>
            {state.shapes.map(shape => (
              <li key={shape.id} data-selected={selectedIds.includes(shape.id)} data-hovered={state.interaction.hoveredShape?.id === shape.id}>
                <button type='button' onClick={() => actions.selectShapes([shape.id])}>
                  {shape.type} - {shape.style?.strokeColor}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {state.contextMenu && (
        <div
          role='menu'
          className='custom-editor-context-menu'
          style={{ left: state.contextMenu.clientPosition.x, top: state.contextMenu.clientPosition.y }}
        >
          <button
            type='button'
            role='menuitem'
            onClick={() => {
              actions.duplicateShapes(contextMenuIds, { translate: true, select: true })
              actions.closeContextMenu()
            }}
          >
            duplicate
          </button>
          <button type='button' role='menuitem' onClick={actions.closeContextMenu}>
            close
          </button>
        </div>
      )}
    </div>
  )
}

const CustomEditor = () => {
  const { editorProps, canvasProps } = useReactPaint({ width: 600, height: 400 })

  return (
    <MyEditor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
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
          'An editor built from scratch with `editorProps` only: `state` to render, `actions` to act on the canvas, and `editorRef` to set on the root element. It reacts to the hovered shape (`state.interaction.hoveredShape`) and handles its own context menu (`state.contextMenu`).'
      },
      source: {
        code: `const MyEditor = ({ editorProps, children }) => {
  const { state, actions, editorRef } = editorProps
  const selectedIds = state.selectedShapes.map(shape => shape.id)

  return (
    <div ref={editorRef}>
      {state.tools.map(tool => (
        <button key={tool.id} aria-pressed={state.activeTool.id === tool.id} onClick={() => actions.selectTool(tool.id)}>
          {tool.label ?? tool.type}
        </button>
      ))}
      <button disabled={!state.history.canUndo} onClick={actions.undo}>undo</button>
      {children}
      <ul>
        {state.shapes.map(shape => (
          <li key={shape.id} data-hovered={state.interaction.hoveredShape?.id === shape.id}>
            <button onClick={() => actions.selectShapes([shape.id])}>{shape.type}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const App = () => {
  const { editorProps, canvasProps } = useReactPaint()
  return (
    <MyEditor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
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
