import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, Editor, PaintProvider, usePaint, usePaintState, useReactPaint } from '../../../src/index'
import { wait } from '../helpers'

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

const ExternalToolbarApp = () => {
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
  title: 'Tests/Manipulation/ExternalToolbar',
  component: ExternalToolbarApp,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ExternalToolbarApp>

export default meta
type Story = StoryObj<typeof meta>

export const ExternalToolbar: Story = {
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
    await wait(50)
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 40 } })
    await wait(50)
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await wait(100)

    expect(shapesCount).toHaveTextContent('1 shape(s)')
    expect(toolbar.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'false')

    // --- Undo and redo from the app toolbar ---
    await userEvent.click(toolbar.getByRole('button', { name: 'Undo' }))
    expect(shapesCount).toHaveTextContent('0 shape(s)')
    await userEvent.click(toolbar.getByRole('button', { name: 'Redo' }))
    expect(shapesCount).toHaveTextContent('1 shape(s)')
  }
}
