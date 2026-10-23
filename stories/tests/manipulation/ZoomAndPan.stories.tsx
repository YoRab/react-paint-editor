import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { DrawableShape, Point } from '../../../src/index'
import { getPaint, getState, makeCoordConverters, ReactPaintWrapper, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// filled 100×100 square, center at canvas (300, 300)
const SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }
}

const getView = () => getState().view

export const ZoomAndPan: Story = {
  args: {
    shapes: [SQUARE],
    // an infinite drawing can always be zoomed
    options: { size: 'infinite', canZoom: 'never' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()

    /** Dispatches a wheel event at the center of the canvas, and tells whether the page scroll was prevented */
    const wheel = (init: WheelEventInit) => {
      const event = new WheelEvent('wheel', { clientX: toClientX(500), clientY: toClientY(300), bubbles: true, cancelable: true, ...init })
      drawCanvas.dispatchEvent(event)
      return event.defaultPrevented
    }

    /** Dispatches an event of a finger at a point of the canvas */
    const touch = (type: string, pointerId: number, [x, y]: Point, target: EventTarget = drawCanvas) => {
      target.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: 'touch',
          isPrimary: pointerId === 1,
          clientX: toClientX(x),
          clientY: toClientY(y),
          bubbles: true,
          cancelable: true
        })
      )
    }

    const resetView = () => getPaint().actions.resetZoom()

    // =====================================================================
    // Wheel: Ctrl zooms, the wheel scrolls, Shift scrolls horizontally
    // =====================================================================

    expect(wheel({ deltaY: -100, ctrlKey: true })).toBe(true)
    expect(getView().zoom).toBeCloseTo(1.1)
    resetView()

    expect(wheel({ deltaY: 100 })).toBe(true)
    expect(getView().offset).toEqual([0, -100])

    wheel({ deltaY: 100, shiftKey: true })
    expect(getView().offset).toEqual([-100, -100])

    // 3 lines of 16 pixels
    wheel({ deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE })
    expect(getView().offset).toEqual([-100, -148])
    resetView()

    // =====================================================================
    // Zoom panel of the editor: zoom in, zoom out, and back to 100%
    // =====================================================================

    await user.click(view.getByRole('button', { name: 'Zoom in' }))
    expect(getView().zoom).toBe(2)
    await user.click(view.getByRole('button', { name: 'Zoom out' }))
    await user.click(view.getByRole('button', { name: 'Zoom out' }))
    expect(getView().zoom).toBe(0.5)
    await user.click(view.getByRole('button', { name: '50%' }))
    expect(getView().zoom).toBe(1)

    // =====================================================================
    // Pinch: two fingers moving apart zoom in
    // =====================================================================

    touch('pointerdown', 1, [400, 300])
    touch('pointerdown', 2, [600, 300])
    // the second finger moves outside of the canvas: the document is listened
    touch('pointermove', 2, [700, 300], document)
    touch('pointermove', 2, [800, 300], document)
    expect(getView().zoom).toBeCloseTo(2)
    touch('pointerup', 2, [800, 300])
    touch('pointerup', 1, [400, 300])
    // the square was not moved by the fingers
    expect(getState().shapes[0]).toMatchObject({ x: 250, y: 250 })
    resetView()

    // =====================================================================
    // Long press: a finger held still opens the context menu, a moving one does not
    // =====================================================================

    touch('pointerdown', 3, [300, 300])
    await wait(600)
    touch('pointerup', 3, [300, 300])
    expect(await view.findByRole('button', { name: 'Duplicate' })).toBeInTheDocument()

    // its sub menus open while they are hovered
    await user.hover(view.getByRole('button', { name: 'Organize' }))
    expect(await view.findByRole('button', { name: 'Move forward' })).toBeInTheDocument()
    await user.unhover(view.getByRole('button', { name: 'Organize' }))
    await waitFor(() => expect(view.queryByRole('button', { name: 'Move forward' })).toBeNull())
    await user.hover(view.getByRole('button', { name: 'Transform' }))
    expect(await view.findByRole('button', { name: 'Flip horizontally' })).toBeInTheDocument()

    await user.pointer({ target: document.body, keys: '[MouseLeft]' })
    await waitFor(() => expect(view.queryByRole('button', { name: 'Duplicate' })).toBeNull())

    touch('pointerdown', 4, [300, 300])
    touch('pointermove', 4, [330, 300])
    await wait(600)
    touch('pointerup', 4, [330, 300])
    expect(view.queryByRole('button', { name: 'Duplicate' })).toBeNull()
    // the finger moved the square
    expect(getState().shapes[0]).toMatchObject({ x: 280, y: 250 })
  }
}
