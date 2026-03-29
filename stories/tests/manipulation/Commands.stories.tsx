import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  makeCoordConverters,
  selectTool,
  assertNoInternalFields,
  setColorSetting,
  openContextMenuAndClick
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

export const Commands: Story = {
  args: {
    shapes: [INITIAL_SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()

    const { toClientX, toClientY } = makeCoordConverters(rect)

    const user = userEvent.setup()

    // =====================================================================
    // Cut (CTRL+X) + Paste (CTRL+V)
    // INITIAL_SQUARE center: canvas (300, 300).
    // copyShapes translates by +20 → after paste: center (320, 320).
    // =====================================================================

    // --- Select the square ---
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Cut (CTRL+X): clipboard event dispatched on document ---
    document.dispatchEvent(new ClipboardEvent('cut'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is removed ---
    expect(getCurrentDataRef.current).not.toBeNull()
    expect(getCurrentDataRef.current!().shapes).toHaveLength(0)

    // --- Paste (CTRL+V): restored with +20 offset, new shape is selected ---
    document.dispatchEvent(new ClipboardEvent('paste'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is pasted ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(1)

    // =====================================================================
    // Change pasted shape color to red, then Copy (CTRL+C) + Paste (CTRL+V)
    // After 2nd paste: center (340, 340).
    // =====================================================================

    // --- Change fill color to red (pasted shape is selected) ---
    await setColorSetting(view, 'Couleur de fond', 'red')

    // --- Copy (CTRL+C) ---
    document.dispatchEvent(new ClipboardEvent('copy'))
    await new Promise(res => setTimeout(res, 100))

    // --- Paste (CTRL+V): new copy at +20 offset, selected ---
    document.dispatchEvent(new ClipboardEvent('paste'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert 2 shapes ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(2)

    // =====================================================================
    // Change 2nd pasted shape color to yellow, then Duplicate via context menu
    // =====================================================================

    // --- Change fill color to yellow (2nd pasted shape is selected) ---
    await setColorSetting(view, 'Couleur de fond', 'yellow')

    // --- Right-click on the yellow shape (center at canvas (340, 340)) ---
    await openContextMenuAndClick(user, drawCanvas, view, toClientX(340), toClientY(340), 'Duplicate')

    // =====================================================================
    // Assertions: 3 squares total
    // =====================================================================

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(3)
    for (const shape of data.shapes!) {
      assertNoInternalFields(shape)
      expect((shape as { type: string }).type).toBe('square')
    }
  }
}
