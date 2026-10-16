import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, type DrawableShape, shallowEqual, usePaintState, useReactPaint } from '../src/index'
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
  const paint = useReactPaint({ shapes: [SQUARE] })
  // the selector builds an object: shallowEqual keeps it while its values are unchanged
  const { selectedShapes, shapes } = usePaintState(paint, state => ({ selectedShapes: state.selectedShapes, shapes: state.shapes }), shallowEqual)

  return (
    <div ref={paint.editorRef} style={{ width: 600 }}>
      <Canvas paint={paint} options={{ canvasBackgroundColor: '#f5f5f5' }} />
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
          'The `Canvas` component used alone, without the library `Editor`, which is then not bundled. Set `paint.editorRef` on an element wrapping the canvas: it defines the area where interactions and keyboard shortcuts are active.'
      },
      source: {
        code: `import { Canvas, useReactPaint } from '@yorab/react-paint/canvas'
import '@yorab/react-paint/canvas/canvas.css'

const CanvasOnly = () => {
  const paint = useReactPaint({ shapes })

  return (
    <div ref={paint.editorRef}>
      <Canvas paint={paint} />
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
