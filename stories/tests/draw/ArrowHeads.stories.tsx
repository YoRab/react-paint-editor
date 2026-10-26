import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPixel,
  ReactPaintWrapper,
  selectTool,
  setAdvancedRangeSetting,
  setRangeSetting,
  setSelectSetting,
  toClient,
  wait
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

const isPainted = (drawCanvas: HTMLCanvasElement, point: Point) => getPixel(drawCanvas, point)[3]! > 128

/** The heads of the ends of a line and of an open polygon, chosen in the settings bar, and their size in the other options */
export const ArrowHeads: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement

    await selectTool(view, 'line')
    await setSelectSetting(view, 'Flèche au début', 'circle')
    await setSelectSetting(view, 'Flèche à la fin', 'triangle')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setAdvancedRangeSetting(view, 'Taille des flèches', 2)

    const start = toClient([300, 300])
    const end = toClient([600, 300])
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: start })
    await wait()
    await user.pointer({ target: drawCanvas, coords: end })
    await wait()
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: end })
    await wait(100)

    const [line] = getCurrentDataRef.current!().shapes!
    expect(line).toMatchObject({ type: 'line', style: { arrowStart: 'circle', arrowEnd: 'triangle', arrowSize: 2, lineWidth: 10 } })
    assertNoInternalFields(line)

    // heads of 30 units: a circle of radius 22.5 centered on the start, a triangle 60 long and 60 wide ending at the end,
    // both wider than the stroke 10 wide
    // drawn from its first point
    expect(line).toMatchObject({
      points: [
        [300, 300],
        [600, 300]
      ]
    })
    expect(isPainted(drawCanvas, [300, 315])).toBe(true)
    expect(isPainted(drawCanvas, [300, 330])).toBe(false)
    expect(isPainted(drawCanvas, [560, 312])).toBe(true)
    expect(isPainted(drawCanvas, [560, 325])).toBe(false)
    expect(isPainted(drawCanvas, [605, 300])).toBe(false)

    // an open polygon of the polygon tool, which has its own heads: a triangle 40 long at its last point
    await selectTool(view, 'polygon')
    await setSelectSetting(view, 'Flèche à la fin', 'triangle')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    for (const point of [
      [300, 420],
      [450, 420],
      [450, 540]
    ] as Point[]) {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient(point) })
      await wait()
    }
    await selectTool(view, 'selection')
    await wait(100)

    const polygon = getCurrentDataRef.current!().shapes![0]
    expect(polygon).toMatchObject({ type: 'polygon', style: { arrowStart: 'none', arrowEnd: 'triangle', arrowSize: 1, closedPoints: 0 } })
    // 12 above the tip, the triangle is 12 wide, beyond the stroke 5 wide
    expect(isPainted(drawCanvas, [453, 528])).toBe(true)
    expect(isPainted(drawCanvas, [460, 528])).toBe(false)
  }
}
