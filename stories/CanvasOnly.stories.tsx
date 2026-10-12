import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, type DrawableShape, useReactPaint } from '../src/index'
import { makeCoordConverters } from './tests/helpers'

const SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: { fillColor: 'red', strokeColor: 'black' }
}

/** Canvas used without the library editor: editorRef is set on the wrapper to enable interactions and keyboard shortcuts */
const CanvasOnly = () => {
  const { editorProps, canvasProps } = useReactPaint({ shapes: [SQUARE] })
  const { selectedShapes, shapes } = editorProps.state

  return (
    <div ref={editorProps.editorRef} style={{ width: 600 }}>
      <Canvas canvasProps={canvasProps} options={{ canvasBackgroundColor: '#f5f5f5' }} />
      <output data-testid='status'>
        {shapes.length} shape(s) - selected:{' '}
        {selectedShapes.map(shape => ('x' in shape ? `${shape.type} at x=${Math.round(shape.x)}` : shape.type)).join(', ') || 'none'}
      </output>
    </div>
  )
}

const meta = {
  title: 'React Paint/Canvas only',
  component: CanvasOnly,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof CanvasOnly>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'The `Canvas` component used alone, without the library `Editor`, which is then not bundled. Set `editorProps.editorRef` on an element wrapping the canvas: it defines the area where interactions and keyboard shortcuts are active.'
      },
      source: {
        code: `import { Canvas, useReactPaint } from '@yorab/react-paint/canvas'
import '@yorab/react-paint/canvas/canvas.css'

const CanvasOnly = () => {
  const { editorProps, canvasProps } = useReactPaint({ shapes })

  return (
    <div ref={editorProps.editorRef}>
      <Canvas canvasProps={canvasProps} />
    </div>
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
    const status = await view.findByTestId('status')
    await new Promise(res => setTimeout(res, 100))

    expect(canvasElement.querySelector('.react-paint-editor-app')).toBeNull()
    expect(status).toHaveTextContent('1 shape(s) - selected: none')

    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())

    // --- Select and drag the square ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(400), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(400), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))
    expect(status).toHaveTextContent('1 shape(s) - selected: square at x=350')

    // --- Keyboard shortcuts are active ---
    await userEvent.keyboard('{Delete}')
    await new Promise(res => setTimeout(res, 100))
    expect(status).toHaveTextContent('0 shape(s) - selected: none')
  }
}
