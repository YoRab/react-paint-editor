import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  selectTool,
  assertNoInternalFields,
  setColorSetting,
  setRangeSetting,
  setSelectSetting,
  openContextMenuAndClick
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

export const DrawPolygon: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'polygon')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setSelectSetting(view, 'Fermer les points', 'Oui')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (triangle centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET - 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (triangle centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'polygon')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET - 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))
    // Exit drawing mode, then click the shape to select it
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy + 7 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setSelectSetting(view, 'Fermer les points', 'Non')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Add a point to shape 2 by double-clicking between P0 (cx+OFFSET, cy-60) and P1 (cx+OFFSET+60, cy+40) ---
    // Midpoint: (cx + OFFSET + 30, cy - 10) — well inside the 50-unit hit radius of the segment.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx + OFFSET + 30, y: cy - 10 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape 2 now has 4 points ---
    expect(getCurrentDataRef.current).not.toBeNull()
    expect((getCurrentDataRef.current!().shapes![0] as { points: unknown[] }).points.length).toBe(4)

    // --- Delete the added point via context menu ---
    // Right-click on the newly added point (index 1, same client coords as the double-click above).
    // selectShape detects the vertex anchor → context menu shows "Delete point".
    await openContextMenuAndClick(user, drawCanvas, view, cx + OFFSET + 30, cy - 10, 'Delete point')
    await new Promise(res => setTimeout(res, 100))

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({
      type: 'polygon',
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1, closedPoints: 1 }
    })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { points: unknown[] }).points.length).toBeGreaterThanOrEqual(3)

    expect(data.shapes![0]).toMatchObject({
      type: 'polygon',
      style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2, closedPoints: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    // Point added then deleted → back to 3 points.
    expect((data.shapes![0] as { points: unknown[] }).points.length).toBe(3)
  }
}
