import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  makeCoordConverters,
  selectTool,
  assertNoInternalFields
} from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// 100×100 filled square on the left side of the canvas, center at canvas (300, 300).
const INITIAL_SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: '#4a90d9',
    opacity: 100,
    lineWidth: 2
  }
}

export const StateManagement: Story = {
  args: {
    shapes: [INITIAL_SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()

    const { toClientX, toClientY } = makeCoordConverters(rect)

    const user = userEvent.setup()

    // --- Select the square (filled, center at canvas (300, 300)) ---
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Delete the shape with the Delete key ---
    // The keyboard listener is registered on document when isInsideComponent is true.
    await userEvent.keyboard('{Delete}')
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is deleted ---
    expect(getCurrentDataRef.current).not.toBeNull()
    expect(getCurrentDataRef.current!().shapes).toHaveLength(0)

    // --- Undo ---
    await userEvent.click(await view.findByTestId('tool-undo'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is restored ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(1)
    const restored = getCurrentDataRef.current!().shapes![0]
    assertNoInternalFields(restored)
    expect((restored as { type: string }).type).toBe('square')

    // --- Redo ---
    await userEvent.click(await view.findByTestId('tool-redo'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is deleted again ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(0)
  }
}
