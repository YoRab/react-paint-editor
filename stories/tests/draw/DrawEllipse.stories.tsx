import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  selectTool,
  assertNoInternalFields,
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

export const DrawEllipse: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'ellipse')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 60, y: cy - 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'ellipse')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 60, y: cy - 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({
      type: 'ellipse',
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 }
    })
    assertNoInternalFields(data.shapes![1])
    const el1 = data.shapes![1] as { radiusX: number; radiusY: number }
    expect(el1.radiusX).toBeGreaterThan(0)
    expect(el1.radiusY).toBeGreaterThan(0)

    expect(data.shapes![0]).toMatchObject({
      type: 'ellipse',
      style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 }
    })
    assertNoInternalFields(data.shapes![0])
    const el2 = data.shapes![0] as { radiusX: number; radiusY: number }
    expect(el2.radiusX).toBeGreaterThan(0)
    expect(el2.radiusY).toBeGreaterThan(0)
  }
}
