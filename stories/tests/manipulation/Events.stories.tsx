import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import {
  eventsLog,
  getLoggedValues,
  getState,
  makeCoordConverters,
  ReactPaintWrapper,
  selectTool,
  setColorSetting,
  square,
  stateEventsLog,
  wait
} from './../helpers'

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

/** The events of the state are emitted for the changes made from the Editor and from the canvas */
export const StateEvents: Story = {
  args: {
    shapes: [square('a', 100, 100)],
    options: { canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    // the events of the loading and of the first layout are left out
    await wait(100)
    stateEventsLog.length = 0

    // --- The grid chosen in the layers panel: the same grid again changes nothing ---
    await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
    await userEvent.click(await view.findByRole('button', { name: /^M, / }))
    expect(getLoggedValues('gridChanged')).toEqual([20])
    await userEvent.click(await view.findByRole('button', { name: /^M, / }))
    expect(getLoggedValues('gridChanged')).toEqual([20])
    await userEvent.click(await view.findByRole('button', { name: 'No grid' }))
    expect(getLoggedValues('gridChanged')).toEqual([20, 0])
    await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))

    // --- The zoom of the zoom panel ---
    await user.click(view.getByRole('button', { name: 'Zoom in' }))
    expect(getLoggedValues('viewChanged').at(-1)).toBe(getState().view)
    expect(getState().view.zoom).toBe(2)
    // named by the zoom it shows
    await user.click(view.getByTitle('Reset zoom'))
    expect(getState().view.zoom).toBe(1)

    // --- A default value of a tool, changed without selection ---
    await selectTool(view, 'rect')
    await setColorSetting(view, 'Stroke color', 'red')
    expect(getLoggedValues('toolsChanged').at(-1)).toBe(getState().tools)
    await selectTool(view, 'selection')

    // --- The context menu, opened and closed ---
    stateEventsLog.length = 0
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: toClientX(150), y: toClientY(150) } })
    await wait(100)
    expect(getLoggedValues('contextMenuChanged')).toEqual([getState().contextMenu])
    expect(getState().contextMenu?.shapes.map(shape => shape.id)).toEqual(['a'])
    await userEvent.keyboard('{Escape}')
    await wait(100)
    expect(getLoggedValues('contextMenuChanged')).toEqual([expect.anything(), undefined])

    // --- A drag changes the shapes at each move, and saves a single step on release ---
    stateEventsLog.length = 0
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(150), y: toClientY(150) } })
    for (const step of [1, 2, 3]) {
      await user.pointer({ target: drawCanvas, coords: { x: toClientX(150 + step * 30), y: toClientY(150) } })
      await wait(20)
    }
    expect(getLoggedValues('shapesChanged').length).toBeGreaterThan(1)
    expect(getLoggedValues('dataChanged')).toHaveLength(0)
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(240), y: toClientY(150) } })
    await wait(100)
    expect(getLoggedValues('dataChanged')).toHaveLength(1)
    expect(getLoggedValues('historyChanged')).toEqual([{ canUndo: true, canRedo: false, canClear: true }])
  }
}
