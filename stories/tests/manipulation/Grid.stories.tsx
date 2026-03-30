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

// Rect at x=120, y=100, width=200, height=200 → center=(220,200).
// Center is a multiple of all grid sizes (10, 20, 40), so snapping is predictable.
const INITIAL_RECT_GRID: DrawableShape = {
  type: 'rect',
  x: 120,
  y: 100,
  width: 200,
  height: 200,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: '#4a90d9',
    opacity: 100,
    lineWidth: 2
  }
}

export const Grid: Story = {
  args: {
    shapes: [INITIAL_RECT_GRID]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const { toClientX, toClientY } = makeCoordConverters(rect)
    const user = userEvent.setup()

    // Opens the layers panel, clicks the grid button, then closes the panel.
    const setGrid = async (label: 'S' | 'M' | 'L') => {
      await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
      await new Promise(res => setTimeout(res, 50))
      await userEvent.click(await view.findByRole('button', { name: label }))
      await new Promise(res => setTimeout(res, 50))
      await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
      await new Promise(res => setTimeout(res, 50))
    }

    // Selects the rect by clicking its center (200, 200).
    const selectRect = async () => {
      await selectTool(view, 'selection')
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(200), y: toClientY(200) } })
      await new Promise(res => setTimeout(res, 100))
    }

    // Drags from center (200,200) to (228,200): a +28px horizontal translation.
    const translateRect = async () => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(200), y: toClientY(200) } })
      await new Promise(res => setTimeout(res, 50))
      await user.pointer({ target: drawCanvas, coords: { x: toClientX(228), y: toClientY(200) } })
      await new Promise(res => setTimeout(res, 50))
      await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(228), y: toClientY(200) } })
      await new Promise(res => setTimeout(res, 100))
    }

    // =====================================================================
    // Test 1: No grid
    // roundForGrid(228, 0)=228, roundForGrid(200, 0)=200 → delta=28, new x=148
    // =====================================================================
    await selectRect()
    await translateRect()

    let data = getCurrentDataRef.current!()
    let shape = data.shapes![0] as { type: string; x: number; y: number }
    assertNoInternalFields(data.shapes![0])
    expect(shape.type).toBe('rect')
    expect(shape.x).toBeCloseTo(148, 0)
    expect(shape.y).toBeCloseTo(100, 0)

    await userEvent.click(await view.findByTestId('tool-undo'))
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Test 2: Small grid (10px)
    // roundForGrid(228, 10)=230, roundForGrid(200, 10)=200 → delta=30, new x=150
    // =====================================================================
    await setGrid('S')
    await selectRect()
    await translateRect()

    data = getCurrentDataRef.current!()
    shape = data.shapes![0] as { type: string; x: number; y: number }
    assertNoInternalFields(data.shapes![0])
    expect(shape.type).toBe('rect')
    expect(shape.x).toBeCloseTo(150, 0)
    expect(shape.y).toBeCloseTo(100, 0)

    await userEvent.click(await view.findByTestId('tool-undo'))
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Test 3: Medium grid (20px)
    // roundForGrid(228, 20)=220, roundForGrid(200, 20)=200 → delta=20, new x=140
    // =====================================================================
    await setGrid('M')
    await selectRect()
    await translateRect()

    data = getCurrentDataRef.current!()
    shape = data.shapes![0] as { type: string; x: number; y: number }
    assertNoInternalFields(data.shapes![0])
    expect(shape.type).toBe('rect')
    expect(shape.x).toBeCloseTo(140, 0)
    expect(shape.y).toBeCloseTo(100, 0)

    await userEvent.click(await view.findByTestId('tool-undo'))
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Test 4: Large grid (40px)
    // roundForGrid(228, 40)=240, roundForGrid(200, 40)=200 → delta=40, new x=160
    // =====================================================================
    await setGrid('L')
    await selectRect()
    await translateRect()

    data = getCurrentDataRef.current!()
    shape = data.shapes![0] as { type: string; x: number; y: number }
    assertNoInternalFields(data.shapes![0])
    expect(shape.type).toBe('rect')
    expect(shape.x).toBeCloseTo(160, 0)
    expect(shape.y).toBeCloseTo(100, 0)
  }
}
