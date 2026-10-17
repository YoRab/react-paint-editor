import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, Editor, PaintProvider, usePaint, usePaintState, useReactPaint } from '../src/index'

/** A toolbar of the app, outside of the editor: it gets the canvas handle from the PaintProvider */
const AppToolbar = () => {
  const paint = usePaint()
  const history = usePaintState(paint, state => state.history)
  const shapesCount = usePaintState(paint, state => state.shapes.length)
  const isRectActive = usePaintState(paint, state => state.activeTool.type === 'rect')

  return (
    <div role='toolbar' aria-label='App toolbar' style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <button type='button' aria-pressed={isRectActive} onClick={() => paint.actions.selectTool('react-paint-rect')}>
        Rectangle
      </button>
      <button type='button' disabled={!history.canUndo} onClick={paint.actions.undo}>
        Undo
      </button>
      <button type='button' disabled={!history.canRedo} onClick={paint.actions.redo}>
        Redo
      </button>
      <output data-testid='shapes-count'>{shapesCount} shape(s)</output>
    </div>
  )
}

const ExternalToolbar = () => {
  const paint = useReactPaint()

  return (
    <PaintProvider paint={paint}>
      <AppToolbar />
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </PaintProvider>
  )
}

const meta = {
  title: 'React Paint/External toolbar',
  component: ExternalToolbar,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof ExternalToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'A toolbar placed outside of the editor, anywhere under a `PaintProvider`. It reads the handle with `usePaint`, and the state with `usePaintState`: it renders again only when what it shows changes, and the component calling `useReactPaint` never renders again.'
      },
      source: {
        code: `const AppToolbar = () => {
  const paint = usePaint()
  const history = usePaintState(paint, state => state.history)
  const shapesCount = usePaintState(paint, state => state.shapes.length)

  return (
    <div>
      <button onClick={() => paint.actions.selectTool('react-paint-rect')}>Rectangle</button>
      <button disabled={!history.canUndo} onClick={paint.actions.undo}>Undo</button>
      <button disabled={!history.canRedo} onClick={paint.actions.redo}>Redo</button>
      <output>{shapesCount} shape(s)</output>
    </div>
  )
}

const App = () => {
  const paint = useReactPaint()

  return (
    <PaintProvider paint={paint}>
      <AppToolbar />
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </PaintProvider>
  )
}`,
        language: 'tsx'
      }
    }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const toolbar = within(await view.findByRole('toolbar', { name: 'App toolbar' }))
    const shapesCount = await view.findByTestId('shapes-count')
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    expect(shapesCount).toHaveTextContent('0 shape(s)')
    expect(toolbar.getByRole('button', { name: 'Undo' })).toBeDisabled()

    // --- Select a tool from the app toolbar, then draw ---
    await userEvent.click(toolbar.getByRole('button', { name: 'Rectangle' }))
    expect(toolbar.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'true')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    expect(shapesCount).toHaveTextContent('1 shape(s)')
    expect(toolbar.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'false')

    // --- Undo and redo from the app toolbar ---
    await userEvent.click(toolbar.getByRole('button', { name: 'Undo' }))
    expect(shapesCount).toHaveTextContent('0 shape(s)')
    await userEvent.click(toolbar.getByRole('button', { name: 'Redo' }))
    expect(shapesCount).toHaveTextContent('1 shape(s)')
  }
}
