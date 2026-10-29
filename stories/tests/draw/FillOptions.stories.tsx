import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPaint,
  getPixel,
  getState,
  inMoreOptions,
  ReactPaintWrapper,
  selectTool,
  setAdvancedRangeSetting,
  setColorSetting,
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

/**
 * The pattern of the fills, in the settings bar, and their gradient, its second color and its angle in the panel of the
 * other options
 */
export const FillOptions: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
    const drawRect = async (from: Point, to: Point) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient(from) })
      await wait()
      await user.pointer({ target: drawCanvas, coords: toClient(to) })
      await wait()
      await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient(to) })
      await wait(100)
    }

    await selectTool(view, 'rect')
    await setColorSetting(view, 'Couleur du trait', 'transparent')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Motif du fond', 'hatch')
    await drawRect([100, 100], [300, 300])

    const [hatched] = getCurrentDataRef.current!().shapes!
    expect(hatched).toMatchObject({ type: 'rect', x: 100, y: 100, width: 200, height: 200, style: { fillPattern: 'hatch', fillColor: 'blue' } })
    assertNoInternalFields(hatched)

    // for a stroke 10 wide, lines 5 thick 40 apart at 45°, the first one 20 from the corner: x + y = 228.28, 284.85…
    expect(getPixel(drawCanvas, [114.14, 114.14])).toEqual([0, 0, 255, 255])
    expect(getPixel(drawCanvas, [128.28, 128.28])[3]).toBe(0)

    // the shape is clicked between its lines, like a filled one
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient([128.28, 128.28]) })
    await wait(100)
    expect(getState().selectedShapeIds).toEqual([hatched!.id])

    // the lines across the first ones: x - y = 171.72, 115.15, 58.58, 2.01…
    await setSelectSetting(view, 'Motif du fond', 'crossHatch')
    await wait(100)
    expect(getPixel(drawCanvas, [128.28, 128.28])).toEqual([0, 0, 255, 255])

    // half transparent, the crossing of two lines is not darker than a single line
    await setRangeSetting(view, 'Opacité', 50)
    await wait(100)
    const crossing = getPixel(drawCanvas, [171.72, 169.71])
    const single = getPixel(drawCanvas, [185.86, 155.57])
    expect(single[3]).toBeGreaterThan(100)
    expect(Math.abs(crossing[3]! - single[3]!)).toBeLessThanOrEqual(2)

    // a linear gradient from the left to the right, from the fill color to the second one
    await user.keyboard('{Escape}')
    // the tool keeps the values given to its shapes
    await selectTool(view, 'rect')
    await setRangeSetting(view, 'Opacité', 100)
    await setSelectSetting(view, 'Motif du fond', 'solid')
    await setColorSetting(view, 'Couleur de fond', 'red')
    await inMoreOptions(view, async () => {
      expect(view.queryByRole('button', { name: 'Deuxième couleur du dégradé' })).toBeNull()
      await setSelectSetting(view, 'Dégradé du fond', 'linear')
      await setColorSetting(view, 'Deuxième couleur du dégradé', 'blue')
      expect(view.getByRole('button', { name: 'Angle du dégradé' })).toBeInTheDocument()
    })
    await drawRect([500, 100], [800, 300])

    const [gradient] = getCurrentDataRef.current!().shapes!
    expect(gradient).toMatchObject({
      style: { fillPattern: 'solid', fillGradient: 'linear', fillColor: 'red', fillColor2: 'blue', fillGradientAngle: 0 }
    })
    const [leftRed, , leftBlue] = getPixel(drawCanvas, [502, 200])
    expect(leftRed).toBeGreaterThan(240)
    expect(leftBlue).toBeLessThan(15)
    const [rightRed, , rightBlue] = getPixel(drawCanvas, [798, 200])
    expect(rightRed).toBeLessThan(15)
    expect(rightBlue).toBeGreaterThan(240)

    // turned by 90°, from the top to the bottom: the new shape is selected, the tool draws the next one
    await selectTool(view, 'rect')
    await setAdvancedRangeSetting(view, 'Angle du dégradé', 90)
    await drawRect([500, 350], [800, 550])
    expect(getPixel(drawCanvas, [650, 352])[0]).toBeGreaterThan(240)
    expect(getPixel(drawCanvas, [650, 548])[2]).toBeGreaterThan(240)

    // a radial gradient has no angle, and fades out to a transparent second color
    await selectTool(view, 'rect')
    await inMoreOptions(view, async () => {
      await setSelectSetting(view, 'Dégradé du fond', 'radial')
      expect(view.queryByRole('button', { name: 'Angle du dégradé' })).toBeNull()
      await setColorSetting(view, 'Deuxième couleur du dégradé', 'transparent')
    })
    await drawRect([100, 350], [300, 550])
    const [centerRed, centerGreen, , centerAlpha] = getPixel(drawCanvas, [200, 450])
    expect(centerRed).toBeGreaterThan(245)
    expect(centerGreen).toBeLessThan(10)
    expect(centerAlpha).toBeGreaterThan(245)
    // halfway, red at half its opacity, without the black of a transparent color
    const [halfRed, halfGreen, halfBlue, halfAlpha] = getPixel(drawCanvas, [250, 450])
    expect(halfAlpha).toBeGreaterThan(100)
    expect(halfAlpha).toBeLessThan(155)
    expect(halfRed).toBeGreaterThan(245)
    expect(halfGreen! + halfBlue!).toBeLessThan(10)

    // dots 16 apart for a stroke 4 wide, the first one 8 from the corner, colored by the gradient on their own layer. The
    // style is completed by the tool, turned by 90°
    getPaint().actions.addShapes([
      {
        type: 'rect',
        x: 830,
        y: 350,
        width: 160,
        height: 200,
        style: {
          fillColor: 'red',
          fillPattern: 'dots',
          fillGradient: 'linear',
          fillColor2: 'blue',
          fillGradientAngle: 0,
          lineWidth: 4,
          strokeColor: 'transparent'
        }
      }
    ])
    await wait(100)
    const [firstRed, , firstBlue, firstAlpha] = getPixel(drawCanvas, [838, 358])
    expect(firstAlpha).toBeGreaterThan(200)
    expect(firstRed).toBeGreaterThan(200)
    expect(firstBlue).toBeLessThan(55)
    const [lastRed, , lastBlue] = getPixel(drawCanvas, [982, 358])
    expect(lastRed).toBeLessThan(55)
    expect(lastBlue).toBeGreaterThan(200)
    expect(getPixel(drawCanvas, [846, 366])[3]).toBe(0)
  }
}
