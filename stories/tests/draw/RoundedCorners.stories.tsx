import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import {
  addPictureFromUrl,
  assertNoInternalFields,
  getCurrentDataRef,
  getPixel,
  inMoreOptions,
  ReactPaintWrapper,
  SVG_DATA_URI,
  selectTool,
  setAdvancedRangeSetting,
  setColorSetting,
  setRangeSetting,
  setSelectSetting,
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
 * The corners of the rectangles, of the polygons and of the pictures are rounded in the panel of the other options, and a
 * picture gets a border
 */
export const RoundedCorners: Story = {
  args: { editorOptions: { withUrlPicture: true } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement

    await selectTool(view, 'rect')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setAdvancedRangeSetting(view, 'Arrondi des angles', 30)

    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 200, y: cy - 60 } })
    await wait()
    await user.pointer({ target: drawCanvas, coords: { x: cx - 40, y: cy + 60 } })
    await wait()
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - 40, y: cy + 60 } })
    await wait(100)

    const [drawnRect] = getCurrentDataRef.current!().shapes!
    expect(drawnRect).toMatchObject({ type: 'rect', style: { fillColor: 'blue', cornerRadius: 30 } })
    assertNoInternalFields(drawnRect)
    const { x, y, width, height } = drawnRect as { x: number; y: number; width: number; height: number }
    // the corner is cut, the middle of a side is filled
    expect(getPixel(drawCanvas, [x + 3, y + 3])[3]).toBe(0)
    expect(getPixel(drawCanvas, [x + 3, y + height / 2])).toEqual([0, 0, 255, 255])
    expect(getPixel(drawCanvas, [x + width / 2, y + 3])).toEqual([0, 0, 255, 255])

    // a closed triangle, rounded at its 3 corners
    await selectTool(view, 'polygon')
    await setAdvancedRangeSetting(view, 'Arrondi des angles', 40)
    await setSelectSetting(view, 'Fermer les points', 'Oui')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    const corners: Point[] = [
      [cx + 60, cy - 80],
      [cx + 200, cy + 80],
      [cx + 60, cy + 80]
    ]
    for (const [cornerX, cornerY] of corners) {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cornerX, y: cornerY } })
      await wait()
    }
    await selectTool(view, 'selection')
    const polygon = getCurrentDataRef.current!().shapes!.find(shape => shape.type === 'polygon')
    expect(polygon).toMatchObject({ style: { cornerRadius: 40, closedPoints: 1, fillColor: 'blue' } })
    const [, , rightAngle] = (polygon as { points: Point[] }).points
    // the right angle is cut, the middle of its sides is filled
    expect(getPixel(drawCanvas, [rightAngle![0] + 3, rightAngle![1] - 3])[3]).toBe(0)
    expect(getPixel(drawCanvas, [rightAngle![0] + 3, rightAngle![1] - 80])).toEqual([0, 0, 255, 255])

    // a picture, selected once added, gets a border and rounded corners
    await addPictureFromUrl(view, SVG_DATA_URI)
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setRangeSetting(view, 'Epaisseur du trait', 6)
    await setAdvancedRangeSetting(view, 'Arrondi des angles', 20)

    const picture = getCurrentDataRef.current!().shapes!.find(shape => shape.type === 'picture')
    expect(picture).toMatchObject({ type: 'picture', style: { strokeColor: 'red', lineWidth: 6, cornerRadius: 20 } })
    assertNoInternalFields(picture)
    const box = picture as { x: number; y: number; width: number; height: number }
    expect(getPixel(drawCanvas, [box.x + 2, box.y + 2])[3]).toBe(0)
    expect(getPixel(drawCanvas, [box.x + 1, box.y + box.height / 2])).toEqual([255, 0, 0, 255])
    expect(getPixel(drawCanvas, [box.x + box.width / 2, box.y + box.height / 2])).toEqual([0, 0, 255, 255])

    // a circle has no corners: no radius in its other options
    await selectTool(view, 'circle')
    await inMoreOptions(view, async () => {
      expect(view.queryByRole('button', { name: 'Arrondi des angles' })).toBeNull()
    })
  }
}
