import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import { getPaint, getState, ReactPaintWrapper, square, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const getView = () => getState().view

/** Middle of the visible area, in the units of the drawing */
const getViewCenter = (): Point => {
  const { visibleArea } = getView()
  return [visibleArea.x + visibleArea.width / 2, visibleArea.y + visibleArea.height / 2]
}

/** Dispatches a pointer event at a position of the minimap given as a ratio of its sides */
const pointer = (minimap: HTMLElement, type: string, [ratioX, ratioY]: Point) => {
  const rect = minimap.getBoundingClientRect()
  minimap.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + ratioX * rect.width,
      clientY: rect.top + ratioY * rect.height,
      bubbles: true,
      cancelable: true
    })
  )
}

/** Presses and releases the minimap at the same place, without moving: a click */
const clickMinimap = (minimap: HTMLElement, position: Point) => {
  pointer(minimap, 'pointerdown', position)
  pointer(minimap, 'pointerup', position)
}

const getImage = (minimap: HTMLCanvasElement) => [...minimap.getContext('2d')!.getImageData(0, 0, minimap.width, minimap.height).data]

/** Waits for the transition of the view to be over: the offset no longer changes between two frames */
const waitForView = async () => {
  let previous: Point = [Number.NaN, Number.NaN]
  await waitFor(() => {
    const { offset } = getView()
    const settled = offset[0] === previous[0] && offset[1] === previous[1]
    previous = offset
    expect(settled).toBe(true)
  })
}

export const MiniMap: Story = {
  args: {
    // the two squares are 1500 apart, far beyond the 1000 × 600 view
    shapes: [square('topLeft', 0, 0), square('bottomRight', 1400, 800)],
    options: { size: 'infinite' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    const minimap = (await view.findByTestId('minimap')) as HTMLCanvasElement

    // =====================================================================
    // The minimap is drawn under the buttons of the zoom panel
    // =====================================================================

    expect(view.getByRole('button', { name: '100%' })).toBeInTheDocument()
    const emptyImage = getImage(minimap)
    expect(emptyImage.some(channel => channel !== 0)).toBe(true)
    expect(minimap).toHaveStyle({ cursor: 'pointer' })

    // =====================================================================
    // A click moves the view in a transition, not at once
    // =====================================================================

    const startCenter = getViewCenter()
    clickMinimap(minimap, [0.8, 0.8])
    // the first step of the transition is drawn in the next frame: nothing has moved yet
    expect(getViewCenter()).toEqual(startCenter)

    await waitForView()
    const bottomRightCenter = getViewCenter()
    expect(bottomRightCenter[0]).toBeGreaterThan(startCenter[0])
    expect(bottomRightCenter[1]).toBeGreaterThan(startCenter[1])

    // the other side of the minimap shows the other side of the drawing
    clickMinimap(minimap, [0.2, 0.2])
    await waitForView()
    const topLeftCenter = getViewCenter()
    expect(topLeftCenter[0]).toBeLessThan(startCenter[0])
    expect(topLeftCenter[1]).toBeLessThan(startCenter[1])

    // =====================================================================
    // The middle of the minimap shows the middle of the drawing
    // =====================================================================

    // the 1000 × 600 view stays inside the box of the two squares, so the minimap shows that box alone: the
    // same point of the minimap then always gives the same view, unlike a view going beyond the shapes
    getPaint().actions.resetZoom()
    // the press reads the frame the minimap last drew: a change of the view is drawn in the next one
    await wait(50)
    clickMinimap(minimap, [0.5, 0.5])
    await waitForView()
    const middle = getViewCenter()
    // the box of the squares goes from the first one to the second one, 1500 × 900 plus their strokes
    expect(middle[0]).toBeCloseTo(750, 0)
    expect(middle[1]).toBeCloseTo(450, 0)

    clickMinimap(minimap, [0.5, 0.5])
    await wait(100)
    expect(getViewCenter()[0]).toBeCloseTo(middle[0], 0)
    expect(getViewCenter()[1]).toBeCloseTo(middle[1], 0)

    // =====================================================================
    // A drag moves the view along the pointer, without transition
    // =====================================================================

    getPaint().actions.resetZoom()
    await wait(50)
    const beforeDrag = getViewCenter()

    pointer(minimap, 'pointerdown', [0.5, 0.5])
    // the press alone does not move the view: it may become a drag
    expect(getViewCenter()).toEqual(beforeDrag)

    // a move of less than 3 pixels is still a click
    pointer(minimap, 'pointermove', [0.5 + 1 / 180, 0.5])
    expect(getViewCenter()).toEqual(beforeDrag)

    // beyond that, the view follows the pointer at once, in the frame of the move
    pointer(minimap, 'pointermove', [0.75, 0.5])
    const dragged = getViewCenter()
    expect(dragged[0]).toBeGreaterThan(beforeDrag[0])

    pointer(minimap, 'pointermove', [0.9, 0.5])
    expect(getViewCenter()[0]).toBeGreaterThan(dragged[0])

    // the release leaves the view where the pointer left it
    const released = getViewCenter()
    pointer(minimap, 'pointerup', [0.9, 0.5])
    await wait(100)
    expect(getViewCenter()).toEqual(released)

    // a move after the release no longer moves the view
    pointer(minimap, 'pointermove', [0.2, 0.2])
    expect(getViewCenter()).toEqual(released)

    // =====================================================================
    // The selected shapes are drawn in the color of the selection
    // =====================================================================

    getPaint().actions.resetZoom()
    await wait(50)
    const unselectedImage = getImage(minimap)

    getPaint().actions.selectShapes(['bottomRight'])
    await wait(50)
    expect(getImage(minimap)).not.toEqual(unselectedImage)

    getPaint().actions.clearSelection()
    await wait(50)
    expect(getImage(minimap)).toEqual(unselectedImage)
  }
}

export const MiniMapFixedSize: Story = {
  args: {
    shapes: [square('middle', 450, 250)],
    // a fixed drawing is only zoomed when it is allowed to
    options: { size: 'fixed', canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    const minimap = (await view.findByTestId('minimap')) as HTMLCanvasElement

    // =====================================================================
    // A drawing entirely visible cannot be panned
    // =====================================================================

    // the whole 1000 × 600 drawing is visible at the zoom 1
    expect(getView().visibleArea).toMatchObject({ x: 0, y: 0, width: 1000, height: 600 })
    expect(minimap).toHaveStyle({ cursor: 'default' })

    const center = getViewCenter()
    clickMinimap(minimap, [0.9, 0.9])
    await wait(100)
    expect(getViewCenter()).toEqual(center)

    // =====================================================================
    // Zoomed in, the view moves inside the drawing, and stays in it
    // =====================================================================

    getPaint().actions.zoomTo(2)
    await wait(50)
    expect(minimap).toHaveStyle({ cursor: 'pointer' })

    clickMinimap(minimap, [0.9, 0.9])
    await waitForView()
    // the view is kept inside the drawing: its bottom right corner at most
    const { visibleArea } = getView()
    expect(visibleArea.x + visibleArea.width).toBeCloseTo(1000, 0)
    expect(visibleArea.y + visibleArea.height).toBeCloseTo(600, 0)

    clickMinimap(minimap, [0.1, 0.1])
    await waitForView()
    expect(getView().visibleArea).toMatchObject({ x: 0, y: 0 })
  }
}

export const MiniMapHidden: Story = {
  args: {
    shapes: [square('middle', 450, 250)],
    options: { size: 'infinite' },
    editorOptions: { withMinimap: false }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')

    // the zoom panel is still there, without the minimap
    expect(view.getByRole('button', { name: '100%' })).toBeInTheDocument()
    expect(view.queryByTestId('minimap')).toBeNull()
  }
}
