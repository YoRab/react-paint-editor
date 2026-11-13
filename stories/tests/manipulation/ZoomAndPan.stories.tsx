import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import {
  Canvas,
  type DrawableShape,
  type Point,
  type ShapeEntity,
  type UseReactPaintProps,
  useAnnotationsStyle,
  useReactPaint
} from '../../../src/index'
import { dispatchPointer, dispatchTouch, getPaint, getState, makeCoordConverters, ReactPaintWrapper, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation/ZoomAndPan',
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

/** Dispatches the events of fingers at points of the draw canvas, which do not follow the zoom: they are positions of the page */
const getTouch = (drawCanvas: HTMLElement) => {
  const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
  return (type: string, pointerId: number, [x, y]: Point, target: EventTarget = drawCanvas) =>
    dispatchTouch(target, type, pointerId, { x: toClientX(x), y: toClientY(y) })
}

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

    const touch = getTouch(drawCanvas)

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

    // the buttons are disabled at the first and the last zoom levels
    for (const zoom of [2, 4, 8]) {
      await user.click(view.getByRole('button', { name: 'Zoom in' }))
      expect(getView().zoom).toBe(zoom)
    }
    expect(view.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
    expect(view.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
    for (const zoom of [4, 2, 1, 0.5, 0.25, 0.1, 0.05]) {
      await user.click(view.getByRole('button', { name: 'Zoom out' }))
      expect(getView().zoom).toBe(zoom)
    }
    expect(view.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
    expect(view.getByRole('button', { name: 'Zoom in' })).toBeEnabled()
    await user.click(view.getByRole('button', { name: '5%' }))
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
    expect(await view.findByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument()

    // its sub menus open while they are hovered
    await user.hover(view.getByRole('menuitem', { name: 'Organize' }))
    expect(await view.findByRole('menuitem', { name: 'Bring forward' })).toBeInTheDocument()
    await user.unhover(view.getByRole('menuitem', { name: 'Organize' }))
    await waitFor(() => expect(view.queryByRole('menuitem', { name: 'Bring forward' })).toBeNull())
    await user.hover(view.getByRole('menuitem', { name: 'Transform' }))
    expect(await view.findByRole('menuitem', { name: 'Flip horizontally' })).toBeInTheDocument()

    await user.pointer({ target: document.body, keys: '[MouseLeft]' })
    await waitFor(() => expect(view.queryByRole('menuitem', { name: 'Duplicate' })).toBeNull())

    touch('pointerdown', 4, [300, 300])
    touch('pointermove', 4, [330, 300])
    await wait(600)
    touch('pointerup', 4, [330, 300])
    expect(view.queryByRole('menuitem', { name: 'Duplicate' })).toBeNull()
    // the finger moved the square
    expect(getState().shapes[0]).toMatchObject({ x: 280, y: 250 })
  }
}

/** A canvas, with an element laid under it which is given the style of useAnnotationsStyle */
const AnnotatedCanvas = ({ name, ...props }: UseReactPaintProps & { name: string }) => {
  const paint = useReactPaint(props)
  const annotationsStyle = useAnnotationsStyle(paint)
  return (
    <section aria-label={name} style={{ position: 'relative', width: 200 }}>
      <div data-testid='annotations' style={{ ...annotationsStyle, position: 'absolute', inset: 0 }} />
      <Canvas paint={paint} />
    </section>
  )
}

const TOUCH_ACTION_CANVASES: Record<string, UseReactPaintProps> = {
  viewer: { mode: 'viewer' },
  zoomableViewer: { mode: 'viewer', options: { canZoom: 'always' } },
  editor: {},
  disabledEditor: { disabled: true }
}

/**
 * A canvas keeps the touch gestures only when it uses them, to edit or to zoom the drawing: from any other canvas, the
 * fingers scroll the page. The element laid under the canvas follows the same rule
 */
export const TouchAction: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      {Object.entries(TOUCH_ACTION_CANVASES).map(([name, props]) => (
        <AnnotatedCanvas key={name} name={name} shapes={[SQUARE]} {...props} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const getTouchActions = async (name: string) => {
      const section = within(view.getByRole('region', { name }))
      const drawCanvas = await section.findByTestId('draw-canvas')
      return [getComputedStyle(drawCanvas).touchAction, getComputedStyle(section.getByTestId('annotations')).touchAction]
    }

    expect(await getTouchActions('viewer')).toEqual(['auto', 'auto'])
    expect(await getTouchActions('zoomableViewer')).toEqual(['none', 'none'])
    expect(await getTouchActions('editor')).toEqual(['none', 'none'])
    expect(await getTouchActions('disabledEditor')).toEqual(['auto', 'auto'])
  }
}

/** A drawing of a fixed size which cannot be zoomed is not zoomed by a pinch either, nor are its shapes moved by the fingers */
export const PinchWithoutZoom: Story = {
  args: {
    shapes: [SQUARE],
    options: { size: 'fixed', canZoom: 'never' }
  },
  play: async ({ canvasElement }) => {
    const drawCanvas = await within(canvasElement).findByTestId('draw-canvas')
    const touch = getTouch(drawCanvas)

    // the first finger is pressed on the square, then both fingers move apart
    touch('pointerdown', 1, [300, 300])
    touch('pointerdown', 2, [600, 300])
    touch('pointermove', 1, [250, 300])
    touch('pointermove', 2, [700, 300], document)
    touch('pointermove', 2, [800, 300], document)
    touch('pointerup', 2, [800, 300])
    touch('pointerup', 1, [250, 300])
    expect(getView().zoom).toBe(1)
    expect(getView().offset).toEqual([0, 0])
    expect(getState().shapes[0]).toMatchObject({ x: 250, y: 250 })
  }
}

/**
 * A finger or a pen never stays still: their press moves, resizes or rotates the selection once they have moved by more
 * than 5 pixels of the screen. A tap on the selected shape, moving by 2 pixels, is a click, not a drag. The mouse moves
 * the selection from its first pixel
 */
export const TouchTap: Story = {
  args: {
    shapes: [SQUARE]
  },
  play: async ({ canvasElement }) => {
    const drawCanvas = await within(canvasElement).findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const { toClientX, toClientY } = makeCoordConverters(rect)
    /** Pixels of the screen in the units of the drawing */
    const toDrawing = (pixels: number) => (pixels * 1000) / rect.width

    /** Presses a pointer at a point of the drawing, moves it by pixels of the screen, and releases it */
    const press = (pointerType: 'mouse' | 'touch' | 'pen', [x, y]: Point, [dx, dy]: Point, expectedGesture = 'translate') => {
      const start = { x: toClientX(x), y: toClientY(y) }
      const end = { x: start.x + dx, y: start.y + dy }
      dispatchPointer(drawCanvas, 'pointerdown', pointerType, 1, start)
      expect(getState().interaction.mode).toBe(expectedGesture)
      dispatchPointer(drawCanvas, 'pointermove', pointerType, 1, end)
      dispatchPointer(drawCanvas, 'pointerup', pointerType, 1, end)
    }
    const getSquare = () => getState().shapes[0] as ShapeEntity<'square'>
    // the undo clears the selection: the square is selected again, for its anchors
    const undo = () => {
      getPaint().actions.undo()
      getPaint().actions.selectShapes([getSquare().id])
    }
    // the anchors of the selection: its bottom right corner, and the rotation above its middle
    const resizeAnchor: Point = [357, 357]
    const rotationAnchor: Point = [300, 212]

    // a first tap selects the square
    press('touch', [300, 300], [0, 0])
    expect(getState().selectedShapeIds).toHaveLength(1)

    // a finger and a pen trembling by 2 pixels on the square or on its anchors neither move, resize nor rotate it: no step is
    // added to the history, and the square stays selected
    press('touch', [300, 300], [2, 1])
    press('pen', [300, 300], [2, 1])
    press('touch', resizeAnchor, [2, 1], 'resize')
    press('touch', rotationAnchor, [2, 1], 'rotate')
    expect(getSquare()).toMatchObject({ x: 250, y: 250, width: 100, height: 100, rotation: 0 })
    expect(getState().history.canUndo).toBe(false)
    expect(getState().selectedShapeIds).toHaveLength(1)

    // beyond 5 pixels, they do, from the position of the press: the square stays under the finger
    press('touch', [300, 300], [6, 0])
    expect(getSquare().x).toBeCloseTo(250 + toDrawing(6))
    undo()
    press('pen', [300, 300], [6, 0])
    expect(getSquare().x).toBeCloseTo(250 + toDrawing(6))
    undo()
    press('touch', resizeAnchor, [6, 6], 'resize')
    expect(getSquare().width).toBeGreaterThan(100)
    undo()
    press('touch', rotationAnchor, [6, 0], 'rotate')
    expect(getSquare().rotation).not.toBe(0)
    undo()

    // the mouse moves the square by 2 pixels
    press('mouse', [300, 300], [2, 0])
    expect(getSquare().x).toBeCloseTo(250 + toDrawing(2))
    undo()
    expect(getSquare()).toMatchObject({ x: 250, y: 250, width: 100, height: 100, rotation: 0 })

    // a tap of the rectangle tool trembling by 2 pixels draws a rectangle of the default size, like a click: a shape is drawn
    // by the resize of its box from the press
    getPaint().actions.selectTool('react-paint-rect')
    press('touch', [600, 300], [2, 1], 'resize')
    expect(getState().shapes[0]).toMatchObject({ type: 'rect', width: 100, height: 100 })
  }
}
