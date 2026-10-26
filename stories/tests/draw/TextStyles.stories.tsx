import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPaint,
  getPixel,
  inMoreOptions,
  MORE_OPTIONS,
  openNewTextBox,
  ReactPaintWrapper,
  selectTool,
  setColorSetting,
  setRangeSetting,
  setToggleSetting,
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
 * A text gets a background, which fills its selection frame, a line under and through its letters, and an outline in the panel
 * of the other options. The background color is shared with the fill of the other shapes
 */
export const TextStyles: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement

    await selectTool(view, 'text')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setToggleSetting(view, 'Souligné')
    await inMoreOptions(view, async () => {
      await setToggleSetting(view, 'Barré')
      await setColorSetting(view, 'Couleur du contour', 'white')
      await setRangeSetting(view, 'Epaisseur du contour', 4)
    })

    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    // the edition box shows the text with its background, its decorations, of the color of the letters, and its outline
    const textbox = await openNewTextBox(view, user, drawCanvas, cx, cy)
    expect(textbox.style.background).toContain('yellow')
    expect(textbox.style.textDecorationLine).toBe('underline line-through')
    expect(textbox.style.textDecorationColor).toContain('black')
    expect(textbox.style.webkitTextStroke).toContain('white')
    await userEvent.clear(textbox)
    await userEvent.type(textbox, 'Hello')
    await wait()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 150 } })
    await wait(100)

    const [text] = getCurrentDataRef.current!().shapes!
    expect(text).toMatchObject({
      type: 'text',
      value: ['Hello'],
      style: { fillColor: 'yellow', fontUnderline: true, fontStrikethrough: true, outlineColor: 'white', outlineWidth: 4 }
    })
    assertNoInternalFields(text)
    const { x, y, width, fontSize } = text as { x: number; y: number; width: number; fontSize: number }
    // the background fills the selection frame, the box of the text without selection padding, and the underline is drawn
    // under the letters, of their color. The background is checked under the underline, away from the outline of the letters
    expect(getPixel(drawCanvas, [x + 1, y + fontSize - 2])).toEqual([255, 255, 0, 255])
    expect(getPixel(drawCanvas, [x - 3, y + fontSize / 2])[3]).toBe(0)
    expect(getPixel(drawCanvas, [x + width / 2, y + fontSize * 0.9])).toEqual([0, 0, 0, 255])

    // with an opacity, the text is painted as a whole: its underline is not mixed with its background
    getPaint().actions.setShapesStyle([text!.id!], { opacity: 50 })
    await wait()
    const [red, green, blue, alpha] = getPixel(drawCanvas, [x + width / 2, y + fontSize * 0.9])
    expect([red, green, blue]).toEqual([0, 0, 0])
    expect(alpha).toBeCloseTo(128, -1)

    // a text and a rectangle share the background color, but not the options of the texts
    getPaint().actions.addShapes([{ type: 'rect', x: 50, y: 50, width: 100, height: 60 }])
    getPaint().actions.selectAllShapes()
    await wait()
    await setColorSetting(view, 'Couleur de fond', 'green')
    expect(getCurrentDataRef.current!().shapes!).toMatchObject([{ style: { fillColor: 'green' } }, { style: { fillColor: 'green' } }])
    expect(view.queryByRole('button', { name: 'Souligné' })).toBeNull()
    expect(view.queryByRole('button', { name: MORE_OPTIONS })).toBeNull()
  }
}
