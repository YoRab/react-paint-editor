import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPaint,
  makeCoordConverters,
  openNewTextBox,
  ReactPaintWrapper,
  selectTool,
  setColorSetting,
  setRangeSetting,
  setSelectSetting,
  setToggleSetting
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

export const DrawText: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'text')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setSelectSetting(view, 'Police', 'monospace')
    await setToggleSetting(view, 'Gras')
    await setToggleSetting(view, 'Italique')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (at cx - OFFSET) ---
    const textbox1 = await openNewTextBox(view, user, drawCanvas, cx - OFFSET, cy)
    await userEvent.clear(textbox1)
    await userEvent.type(textbox1, 'Hello')
    await new Promise(res => setTimeout(res, 50))
    // Click away to finalize shape 1
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 150 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'text')
    const textbox2 = await openNewTextBox(view, user, drawCanvas, cx + OFFSET, cy)
    await userEvent.clear(textbox2)
    await userEvent.type(textbox2, 'World')
    await new Promise(res => setTimeout(res, 50))

    // --- Shape 2 settings (clicking settings blurs the textbox, saving "World") ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setSelectSetting(view, 'Police', 'arial')
    await setToggleSetting(view, 'Gras') // toggle back to false
    await setToggleSetting(view, 'Italique') // toggle back to false
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({
      type: 'text',
      style: { strokeColor: 'red', opacity: 50, fontFamily: 'monospace', fontBold: true, fontItalic: true }
    })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { value: string[] }).value).toEqual(['Hello'])

    expect(data.shapes![0]).toMatchObject({
      type: 'text',
      style: { strokeColor: 'green', opacity: 75, fontFamily: 'arial', fontBold: false, fontItalic: false }
    })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { value: string[] }).value).toEqual(['World'])
  }
}

/** Like the browser, dispatches a paste of plain text on the focused element */
const pasteText = (target: HTMLElement, text: string) => {
  const clipboardData = new DataTransfer()
  if (text) clipboardData.setData('text/plain', text)
  target.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
}

export const PasteInText: Story = {
  args: {
    // a text of 5 characters of 40 px, around canvas (500, 300)
    shapes: [{ type: 'text', x: 400, y: 280, value: ['Hello'], fontSize: 40, style: { strokeColor: 'black' } }]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    const id = getPaint().getState().shapes[0]!.id
    const { x, y, width, height } = getPaint().getShape(id) as { x: number; y: number; width: number; height: number }
    const center = { x: toClientX(x + width / 2), y: toClientY(y + height / 2) }

    // --- A double click edits the text ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: center })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: center })
    await new Promise(res => setTimeout(res, 100))
    const textbox = await view.findByRole('textbox')

    // --- The caret goes to the end of the row ---
    const range = document.createRange()
    range.selectNodeContents(textbox.lastElementChild!)
    range.collapse(false)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)

    // --- The plain text of the clipboard is inserted at the caret ---
    pasteText(textbox, ' World')
    await new Promise(res => setTimeout(res, 50))
    expect(getPaint().getShape(id)).toMatchObject({ value: ['Hello World'] })

    // --- An empty clipboard changes nothing, and the drawing keeps its shape ---
    pasteText(textbox, '')
    await new Promise(res => setTimeout(res, 50))
    expect(getPaint().getShape(id)).toMatchObject({ value: ['Hello World'] })
    expect(getPaint().getState().shapes).toHaveLength(1)
  }
}
