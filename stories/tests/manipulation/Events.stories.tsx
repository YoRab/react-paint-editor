import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { eventsLog, ReactPaintWrapper, selectTool } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

export const Events: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    eventsLog.length = 0
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const user = userEvent.setup()

    // --- Selecting a drawing tool emits toolChanged ---
    await selectTool(view, 'rect')
    await new Promise(res => setTimeout(res, 50))
    expect(eventsLog).toEqual([{ name: 'toolChanged', toolId: 'react-paint-rect' }])

    // --- Drawing a rect selects it and goes back to the selection tool ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    expect(eventsLog).toContainEqual({ name: 'toolChanged', toolId: 'react-paint-selection' })
    const selectionEvents = eventsLog.filter(event => event.name === 'selectionChanged')
    // Resizing the new shape updates the selection object many times: only one event must be emitted
    expect(selectionEvents).toHaveLength(1)
    expect(selectionEvents[0]).toMatchObject({ name: 'selectionChanged', ids: [expect.stringMatching(/^rect_/)] })

    // --- Unselecting emits an empty selection ---
    await userEvent.keyboard('{Escape}')
    await new Promise(res => setTimeout(res, 100))
    expect(eventsLog[eventsLog.length - 1]).toEqual({ name: 'selectionChanged', ids: [] })
  }
}
