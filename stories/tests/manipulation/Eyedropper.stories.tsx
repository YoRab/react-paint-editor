import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { getPaint, getPixel, getState, ReactPaintWrapper, selectTool, setInputValue, toClient, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const FILL_TITLE = 'Couleur de fond'

/**
 * The eyedropper of the color fields picks a color of the drawing with the next press, which does nothing else, and the
 * custom colors are kept in the recent colors of the fields. pickColor gives the colors as they are drawn
 */
export const Eyedropper: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
    const { actions } = getPaint()
    const getMode = () => getState().interaction.mode
    const press = async (point: [number, number]) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient(point) })
      await wait(50)
    }

    const [dark, translucent] = actions.addShapes([
      { type: 'rect', x: 100, y: 100, width: 200, height: 100, style: { fillColor: '#123456', strokeColor: 'transparent', opacity: 100 } },
      { type: 'rect', x: 400, y: 100, width: 200, height: 100, style: { fillColor: '#ff0000', strokeColor: 'transparent', opacity: 50 } }
    ])
    actions.addShapes([
      { type: 'rect', x: 250, y: 100, width: 100, height: 100, style: { fillColor: '#0000ff', strokeColor: 'transparent', opacity: 50 } }
    ])
    await wait(100)

    // the colors as they are drawn, without the transparency, and 'transparent' where nothing is drawn
    const pickAt = async (point: [number, number]) => {
      const picked = actions.pickColor()
      expect(getMode()).toBe('eyedropper')
      await press(point)
      return picked
    }
    expect(await pickAt([150, 150])).toBe('#123456')
    expect(await pickAt([500, 150])).toBe('#ff0000')
    // the blue rect over the dark one gives their mix, as on the canvas
    const toHex = (channels: number[]) => `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
    expect(await pickAt([275, 150])).toBe(toHex(getPixel(drawCanvas, [275, 150]).slice(0, 3)))
    expect(await pickAt([700, 400])).toBe('transparent')
    expect(getState().shapes).toHaveLength(3)
    expect(getState().selection).toBeUndefined()

    // Escape cancels a pick
    const cancelled = actions.pickColor()
    await user.keyboard('{Escape}')
    expect(await cancelled).toBeUndefined()
    expect(getMode()).toBe('default')

    // the eyedropper of the panel picks the fill of the rect tool, without drawing a rect
    await selectTool(view, 'rect')
    await user.click(await view.findByRole('button', { name: FILL_TITLE }))
    await user.click(await view.findByRole('button', { name: 'Pipette' }))
    expect(view.getByRole('button', { name: 'Pipette' })).toHaveAttribute('data-selected', '1')
    await press([150, 150])
    expect(view.getByRole('button', { name: 'Pipette' })).toHaveAttribute('data-selected', '0')
    const rectTool = () => getState().activeTool
    expect(rectTool()).toMatchObject({ settings: { fillColor: { default: '#123456' } } })
    expect(getState().shapes).toHaveLength(3)
    // the picked color is a recent color of the fields
    expect(view.getByRole('button', { name: '#123456' })).toBeInTheDocument()

    // and a custom color, once the native picker is closed
    const customColor = canvasElement.querySelector<HTMLInputElement>('input[type="color"]')!
    setInputValue(customColor, '#abcdef')
    customColor.dispatchEvent(new Event('input', { bubbles: true }))
    expect(view.queryByRole('button', { name: '#abcdef' })).toBeNull()
    customColor.dispatchEvent(new Event('change', { bubbles: true }))
    await wait()
    const recentColors = [...canvasElement.querySelectorAll('[title="Couleurs récentes"] button')].map(button => button.getAttribute('title'))
    expect(recentColors).toEqual(['#abcdef', '#123456'])
    await user.click(await view.findByRole('button', { name: FILL_TITLE }))

    // the recent colors are shared with the other fields, and a picked color changes the selected shapes
    actions.selectShapes([translucent!])
    await wait()
    await user.click(await view.findByRole('button', { name: FILL_TITLE }))
    expect(view.getByRole('button', { name: '#abcdef' })).toBeInTheDocument()
    await user.click(await view.findByRole('button', { name: 'Pipette' }))
    await press([150, 150])
    expect(getPaint().getShape(translucent!)?.style).toMatchObject({ fillColor: '#123456', opacity: 50 })
    expect(getState().selectedShapeIds).toEqual([translucent])
    actions.undo()
    expect(getPaint().getShape(translucent!)?.style?.fillColor).toBe('#ff0000')
    expect(getPaint().getShape(dark!)?.style?.fillColor).toBe('#123456')
  }
}
