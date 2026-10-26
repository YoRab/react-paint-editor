import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPaint,
  inMoreOptions,
  openNewTextBox,
  ReactPaintWrapper,
  selectTool,
  setAdvancedRangeSetting,
  setNumberSetting,
  setRangeSetting,
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

type TextBox = { x: number; y: number; width: number; height: number; fontSize: number }

/**
 * The line height of a text, in the panel of the other options, makes its box as high as its lines, in the edition box
 * like on the canvas. Changing it keeps the font size, the width and the top of the text
 */
export const TextLineHeight: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await selectTool(view, 'text')
    await setNumberSetting(view, 'Taille du texte', 20)
    await setAdvancedRangeSetting(view, 'Interligne', 1.5)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    // the edition box has the line height of the text, and its box: as high as a line of 1.5 font sizes
    const textbox = await openNewTextBox(view, user, drawCanvas, cx, cy)
    expect(textbox.style.lineHeight).toBe('1.5')
    await userEvent.clear(textbox)
    await userEvent.type(textbox, 'Hello')
    await wait()
    const textboxRect = textbox.getBoundingClientRect()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 150 } })
    await wait(100)

    const [text] = getCurrentDataRef.current!().shapes!
    expect(text).toMatchObject({ type: 'text', value: ['Hello'], fontSize: 20, height: 30, style: { lineHeight: 1.5 } })
    assertNoInternalFields(text)
    const { width } = text as TextBox
    const scale = textboxRect.width / width
    expect(textboxRect.height / scale).toBeCloseTo(30, 0)

    // a line more adds 1.5 font sizes to the height
    getPaint().actions.updateShapes([{ id: text!.id!, value: ['Hello', 'World'] }])
    await wait()
    const twoLines = getCurrentDataRef.current!().shapes![0] as TextBox
    expect(twoLines).toMatchObject({ fontSize: 20, height: 60 })

    // the panel shows the line height of the selected text, with its decimals. A new one keeps the font size, the width
    // and the top left corner of the text
    getPaint().actions.selectShapes([text!.id!])
    await wait()
    await inMoreOptions(view, async () => {
      await userEvent.click(view.getByRole('button', { name: 'Interligne' }))
      expect(view.getByText('1.5')).toBeTruthy()
      await userEvent.click(view.getByRole('button', { name: 'Interligne' }))
      await setRangeSetting(view, 'Interligne', 2)
    })
    await wait()
    const [updated] = getCurrentDataRef.current!().shapes!
    expect(updated).toMatchObject({ fontSize: 20, height: 80, style: { lineHeight: 2 } })
    const updatedBox = updated as TextBox
    expect(updatedBox.width).toBeCloseTo(twoLines.width)
    expect(updatedBox.x).toBeCloseTo(twoLines.x)
    expect(updatedBox.y).toBeCloseTo(twoLines.y)

    // the tool keeps the line height for the next texts
    const textTool = getPaint()
      .getState()
      .tools.find(tool => tool.type === 'text')
    expect(textTool?.settings).toHaveProperty('lineHeight.default', 2)
  }
}
