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

export const DrawRect: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'rect')

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
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'rect')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy + 40 } })
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

    expect(data.shapes![1]).toMatchObject({ type: 'rect', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { width: number; height: number }).width).toBeGreaterThan(0)
    expect((data.shapes![1] as { width: number; height: number }).height).toBeGreaterThan(0)

    expect(data.shapes![0]).toMatchObject({
      type: 'rect',
      style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 }
    })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { width: number; height: number }).width).toBeGreaterThan(0)
    expect((data.shapes![0] as { width: number; height: number }).height).toBeGreaterThan(0)
  }
}
