import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPaint,
  ReactPaintWrapper,
  selectTool,
  setNumberSetting,
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

/** A new text takes the font size and the alignment of its tool, and the font size of a selected text changes its box */
export const TextOptions: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await selectTool(view, 'text')
    await setNumberSetting(view, 'Taille du texte', 20)
    await setSelectSetting(view, 'Alignement du texte', 'center')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy } })
    await wait()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy } })
    await wait(100)

    // the edition box aligns its lines like the canvas
    const textbox = await view.findByRole('textbox')
    expect(textbox.style.textAlign).toBe('center')
    await userEvent.clear(textbox)
    await userEvent.type(textbox, 'Hello')
    await wait()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 150 } })
    await wait(100)

    const [text] = getCurrentDataRef.current!().shapes!
    expect(text).toMatchObject({ type: 'text', value: ['Hello'], fontSize: 20, style: { textAlign: 'center' } })
    expect(text!.style).not.toHaveProperty('fontSize')
    assertNoInternalFields(text)
    const { width, x } = text as { width: number; x: number }

    // a bigger font size, without limit, makes the box wider around its middle, the text being centered. The keys typed
    // in the field, like the backspace, do not remove the selected text
    getPaint().actions.selectShapes([text!.id!])
    await wait()
    await setNumberSetting(view, 'Taille du texte', 300)
    await wait(100)
    const shapes = getCurrentDataRef.current!().shapes!
    expect(shapes).toHaveLength(1)
    expect(shapes[0]).toMatchObject({ fontSize: 300, height: 300 })
    const resizedBox = shapes[0] as { width: number; x: number }
    expect(resizedBox.width).toBeCloseTo(width * 15, 1)
    expect(resizedBox.x + resizedBox.width / 2).toBeCloseTo(x + width / 2, 1)

    // the tool keeps the font size for the next texts
    const textTool = getPaint()
      .getState()
      .tools.find(tool => tool.type === 'text')
    expect(textTool?.settings).toHaveProperty('fontSize.default', 300)

    // the change is one step of the history, saved once the typing stops
    await wait(600)
    getPaint().actions.undo()
    await wait()
    const [restored] = getCurrentDataRef.current!().shapes!
    expect(restored).toMatchObject({ fontSize: 20 })

    // the shortcuts leave the keys to the field: an arrow does not move the selected text, a backspace does not remove it
    getPaint().actions.selectShapes([text!.id!])
    await wait()
    await userEvent.click(view.getByRole('button', { name: 'Taille du texte' }))
    await userEvent.click(view.getByRole('spinbutton', { name: 'Taille du texte' }))
    await userEvent.keyboard('{ArrowLeft}')
    expect(getCurrentDataRef.current!().shapes!).toMatchObject([{ x: (restored as { x: number }).x }])
    await userEvent.keyboard('{Backspace}')
    expect(getCurrentDataRef.current!().shapes!).toMatchObject([{ type: 'text' }])
  }
}
