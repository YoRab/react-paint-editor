import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPaint,
  makeCoordConverters,
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

export const DrawBrushShape: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'brush')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setRangeSetting(view, 'Epaisseur du trait', 14)
    await setSelectSetting(view, 'Type de traits', '1')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const r = Math.min(rect.width, rect.height) * 0.15
    const STEPS = 16

    const user = userEvent.setup()

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    const cx1 = cx - OFFSET
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx1 + r, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({ target: drawCanvas, coords: { x: cx1 + r * Math.cos(angle), y: cy + r * Math.sin(angle) } })
    }
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx1 + r, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, inherits shape 1's tool settings) ---
    const cx2 = cx + OFFSET
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx2 + r, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({ target: drawCanvas, coords: { x: cx2 + r * Math.cos(angle), y: cy + r * Math.sin(angle) } })
    }
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx2 + r, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Select shape 2 (brush does not auto-select, switch to selection tool and click on the stroke) ---
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx2 + r, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setRangeSetting(view, 'Epaisseur du trait', 8)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'brush', style: { strokeColor: 'red', opacity: 50, lineWidth: 14, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    const brush1 = data.shapes![1] as { points: [number, number][][] }
    expect(brush1.points).toHaveLength(1)
    expect(brush1.points[0]!.length).toBeGreaterThan(STEPS * 0.5)

    expect(data.shapes![0]).toMatchObject({ type: 'brush', style: { strokeColor: 'green', opacity: 75, lineWidth: 8, lineDash: 2 } })
    assertNoInternalFields(data.shapes![0])
    const brush2 = data.shapes![0] as { points: [number, number][][] }
    expect(brush2.points).toHaveLength(1)
    expect(brush2.points[0]!.length).toBeGreaterThan(STEPS * 0.5)
  }
}

export const DrawBrushInSeveralStrokes: Story = {
  args: {
    // the brush stays selected after a stroke: the next strokes are added to it
    options: { isBrushShapeDoneOnMouseUp: false }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'brush')
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()

    for (const y of [250, 350]) {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(300), y: toClientY(y) } })
      await new Promise(res => setTimeout(res, 50))
      await user.pointer({ target: drawCanvas, coords: { x: toClientX(400), y: toClientY(y) } })
      await user.pointer({ target: drawCanvas, coords: { x: toClientX(500), y: toClientY(y) } })
      await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(500), y: toClientY(y) } })
      await new Promise(res => setTimeout(res, 100))
    }

    const { shapes } = getPaint().getState()
    expect(shapes).toHaveLength(1)
    const strokes = (shapes[0] as { points: [number, number][][] }).points
    expect(strokes).toHaveLength(2)
    expect(strokes.map(stroke => stroke[0])).toEqual([
      [300, 250],
      [300, 350]
    ])
  }
}
