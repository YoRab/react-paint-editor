import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { assertNoInternalFields, getCurrentDataRef, ReactPaintWrapper, selectTool, setSelectSetting, wait } from './../helpers'

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const MORE_OPTIONS = "Plus d'options"

/** The joins and the caps of the strokes are set in the panel of the other options, which stays open while they are */
export const StrokeOptions: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await selectTool(view, 'polygon')

    await userEvent.click(await view.findByRole('button', { name: MORE_OPTIONS }))
    await setSelectSetting(view, 'Angles du trait', 'miter')
    await setSelectSetting(view, 'Extrémités du trait', 'butt')
    expect(view.getByRole('heading', { name: MORE_OPTIONS })).toBeInTheDocument()
    await userEvent.click(view.getByRole('button', { name: MORE_OPTIONS }))
    expect(view.queryByRole('heading', { name: MORE_OPTIONS })).toBeNull()
    await setSelectSetting(view, 'Type de traits', '4')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    for (const [x, y] of [
      [cx, cy - 60],
      [cx + 60, cy + 40],
      [cx - 60, cy + 40]
    ] as const) {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x, y } })
      await wait()
    }
    await selectTool(view, 'selection')

    const [polygon] = getCurrentDataRef.current!().shapes!
    expect(polygon).toMatchObject({ type: 'polygon', style: { lineJoin: 'miter', lineCap: 'butt', lineDash: 4 } })
    assertNoInternalFields(polygon)

    // the selected polygon, clicked on its stroke, takes the new join
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy + 40 } })
    await wait(100)
    await userEvent.click(await view.findByRole('button', { name: MORE_OPTIONS }))
    await setSelectSetting(view, 'Angles du trait', 'bevel')
    expect(getCurrentDataRef.current!().shapes![0]).toMatchObject({ style: { lineJoin: 'bevel', lineCap: 'butt' } })

    // a circle has neither corners nor ends: no other option
    await selectTool(view, 'circle')
    expect(view.queryByRole('button', { name: MORE_OPTIONS })).toBeNull()
  }
}
