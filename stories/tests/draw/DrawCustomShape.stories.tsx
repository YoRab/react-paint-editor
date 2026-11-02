import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { type CustomToolInput, DEFAULT_TOOLS, type Point, SETTINGS_DEFAULT_CUSTOM } from '../../../src/index'
import { starPath } from '../../fixture'
import {
  assertNoInternalFields,
  getCurrentDataRef,
  getPixel,
  ReactPaintWrapper,
  selectTool,
  setRangeSetting,
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

/** A star whose branches and notches are parameters: its path, written by the application, is built again whenever they change */
const STAR_TOOL: CustomToolInput = {
  id: 'star',
  type: 'custom',
  label: 'Étoile',
  shape: { viewBox: [0, 0, 100, 100], path: starPath },
  settings: {
    ...SETTINGS_DEFAULT_CUSTOM,
    fillColor: { values: ['transparent', 'blue'], default: 'blue' },
    params: {
      branches: { label: 'Branches', min: 3, max: 12, step: 1, default: 5 },
      depth: { label: 'Creux', min: 10, max: 90, step: 5, default: 50 }
    }
  }
}

const ARGS = { options: { availableTools: [...DEFAULT_TOOLS, STAR_TOOL] } }

type Box = { width: number; height: number; x: number; y: number }

/** Draws a star in the box of the drawing, from its top left corner to its bottom right one */
const drawStar = async (view: ReturnType<typeof within>, from: Point, to: Point) => {
  const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
  const user = userEvent.setup()
  await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient(from) })
  await wait()
  await user.pointer({ target: drawCanvas, coords: toClient(to) })
  await wait()
  await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient(to) })
  await wait(100)
  return drawCanvas
}

export const DrawCustomShape: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'custom')

    // a star of 200 x 200 at (100, 100): its circle is centered on (200, 200), of a radius of 100
    const drawCanvas = await drawStar(view, [100, 100], [300, 300])

    const data = getCurrentDataRef.current!()
    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'custom',
      toolId: 'star',
      params: { branches: 5, depth: 50 },
      style: { fillColor: 'blue' }
    })
    assertNoInternalFields(data.shapes![0])
    const box = data.shapes![0] as unknown as Box
    expect(box.width).toBeCloseTo(200, 0)
    expect(box.height).toBeCloseTo(200, 0)

    // the center of the star is filled, the corner of its box is not painted at all: it is a star, not a rectangle
    expect(getPixel(drawCanvas, [200, 200])).toEqual([0, 0, 255, 255])
    expect(getPixel(drawCanvas, [112, 112])[3]).toBe(0)

    // the parameters of the selected shape are changed by their sliders, and its path is built again
    await setRangeSetting(view, 'Branches', 8)
    expect((getCurrentDataRef.current!().shapes![0] as { params: Record<string, number> }).params).toEqual({ branches: 8, depth: 50 })

    // the tool keeps the value for the next shapes
    await selectTool(view, 'custom')
    await drawStar(view, [500, 100], [700, 300])
    const shapes = getCurrentDataRef.current!().shapes!
    expect(shapes).toHaveLength(2)
    expect(shapes[0]).toMatchObject({ type: 'custom', params: { branches: 8, depth: 50 } })

    // their layers show the icon of their tool, the star it draws in its view box, and not the generic one of the custom shapes
    await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
    await wait()
    const layerIcons = [...canvasElement.querySelectorAll('.react-paint-editor-layout > span > svg')]
    expect(layerIcons).toHaveLength(2)
    for (const icon of layerIcons) expect(icon.getAttribute('viewBox')).toBe('0 0 100 100')
  }
}

/** The panel of a group of the toolbar shows its tools side by side, and wraps them in rows of 6 when they are many */
export const ToolbarGroupOfCustomShapes: Story = {
  args: { options: { availableTools: [...DEFAULT_TOOLS, ...['star-1', 'star-2', 'star-3', 'star-4'].map(id => ({ ...STAR_TOOL, id }))] } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const countToolsByRow = (panel: Element) => {
      const tops = [...panel.querySelectorAll('button')].map(button => Math.round(button.getBoundingClientRect().top))
      return [...new Set(tops)].map(top => tops.filter(value => value === top).length)
    }

    // the 3 tools of the lines are in a single row
    await userEvent.click(await view.findByRole('button', { name: 'lines' }))
    expect(countToolsByRow(canvasElement.querySelector('.react-paint-editor-toolbargroup-panel-content')!)).toEqual([3])

    // the 4 shapes and the 4 stars: a row of 6, then a row of 2 (the press on the button closes the other panel)
    await userEvent.click(await view.findByRole('button', { name: 'shapes' }))
    expect(canvasElement.querySelectorAll('.react-paint-editor-toolbargroup-panel-content')).toHaveLength(1)
    expect(countToolsByRow(canvasElement.querySelector('.react-paint-editor-toolbargroup-panel-content')!)).toEqual([6, 2])

    // a custom tool which gives no icon shows the shape it draws, fitted in the icon by its view box
    const starIcon = view.getAllByTitle('Étoile')[0]!.querySelector('svg')!
    expect(starIcon.getAttribute('viewBox')).toBe('0 0 100 100')
    expect(starIcon.querySelector('path')!.getBoundingClientRect().width).toBeGreaterThan(15)
  }
}

export const DrawCustomShapeOnClick: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'custom')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const user = userEvent.setup()

    // a single click, without a drag: the shape takes the size of the view box of its definition, centered on the click
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient([400, 300]) })
    await wait(100)

    const data = getCurrentDataRef.current!()
    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0] as unknown as Box).toMatchObject({ x: 350, y: 250, width: 100, height: 100 })
  }
}
