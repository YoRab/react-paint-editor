import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  ReactPaintWrapper,
  selectTool,
  setColorSetting,
  setRangeSetting,
  setSelectSetting
} from './../helpers'

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const OFFSET = 120

export const DrawSquare: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'square')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Stroke color', 'red')
    await setColorSetting(view, 'Fill color', 'blue')
    await setRangeSetting(view, 'Stroke width', 5)
    await setSelectSetting(view, 'Stroke type', 'Dotted')
    await setRangeSetting(view, 'Opacity', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 50, y: cy - 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'square')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 50, y: cy - 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Stroke color', 'green')
    await setColorSetting(view, 'Fill color', 'yellow')
    await setRangeSetting(view, 'Stroke width', 10)
    await setSelectSetting(view, 'Stroke type', 'Dashed')
    await setRangeSetting(view, 'Opacity', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({
      type: 'square',
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 }
    })
    assertNoInternalFields(data.shapes![1])
    const sq1 = data.shapes![1] as { width: number; height: number }
    expect(sq1.width).toBeGreaterThan(0)
    expect(sq1.width).toBe(sq1.height)

    expect(data.shapes![0]).toMatchObject({
      type: 'square',
      style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 }
    })
    assertNoInternalFields(data.shapes![0])
    const sq2 = data.shapes![0] as { width: number; height: number }
    expect(sq2.width).toBeGreaterThan(0)
    expect(sq2.width).toBe(sq2.height)
  }
}
