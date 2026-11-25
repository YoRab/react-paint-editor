import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { FrameMeasure, GestureMeasure } from '../../../src/index'
import { getPaint, ReactPaintWrapper, square, toClient, wait } from './../helpers'

const meta = {
  title: 'Tests/Performance/ProfilingEvents',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/** The measures of the canvas, while they are listened */
const listenMeasures = () => {
  const frames: FrameMeasure[] = []
  const gestures: GestureMeasure[] = []
  const stopFrames = getPaint().registerEvent('frameDrawn', frame => frames.push(frame))
  const stopGestures = getPaint().registerEvent('gestureMeasured', gesture => gestures.push(gesture))
  return {
    frames,
    gestures,
    stop: () => {
      stopFrames()
      stopGestures()
    }
  }
}

export const ProfilingEvents: Story = {
  args: {
    shapes: [square('a', 100, 100), square('b', 300, 100), square('c', 500, 100)],
    options: { canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
    const user = userEvent.setup()
    await wait(100)
    const { frames, gestures, stop } = listenMeasures()

    // =====================================================================
    // A drag of a shape is a translate gesture, measured at its end with its frames and the draws of the layers
    // =====================================================================

    const start = toClient([150, 150])
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: start })
    for (let step = 1; step <= 5; step++) {
      await user.pointer({ target: drawCanvas, coords: { x: start.x + step * 10, y: start.y } })
      await wait(20)
    }
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: start.x + 50, y: start.y } })
    await waitFor(() => expect(gestures).toHaveLength(1))
    const [translate] = gestures
    expect(translate).toMatchObject({ type: 'translate', shapeCount: 3, selectedCount: 1, zoom: 1 })
    expect(translate!.duration).toBeGreaterThan(0)
    expect(translate!.frames).toBeGreaterThan(0)
    expect(translate!.fps).toBeGreaterThan(0)
    expect(translate!.shapesLayer.draws).toBeGreaterThan(0)
    expect(translate!.shapesLayer.totalDuration).toBeGreaterThanOrEqual(translate!.shapesLayer.maxDuration)

    // each draw of a layer gives its time, its shapes and its size in pixels
    const shapesFrame = frames.find(frame => frame.layer === 'shapes')!
    expect(shapesFrame).toMatchObject({
      drawnShapes: 3,
      culledShapes: 0,
      layeredShapes: 0,
      pixelWidth: drawCanvas.width,
      pixelHeight: drawCanvas.height
    })
    expect(shapesFrame.duration).toBeGreaterThanOrEqual(0)
    expect(frames.some(frame => frame.layer === 'selection')).toBe(true)

    // =====================================================================
    // A click on a shape, which moves nothing, is not a gesture
    // =====================================================================

    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient([350, 150]) })
    await wait(100)
    expect(gestures).toHaveLength(1)

    // =====================================================================
    // A zoom with the wheel is measured once the wheel pauses
    // =====================================================================

    const center = toClient([150, 150])
    for (let tick = 0; tick < 3; tick++) {
      drawCanvas.dispatchEvent(
        new WheelEvent('wheel', { clientX: center.x, clientY: center.y, deltaY: -300, ctrlKey: true, bubbles: true, cancelable: true })
      )
      await wait(20)
    }
    await waitFor(() => expect(gestures).toHaveLength(2))
    expect(gestures[1]).toMatchObject({ type: 'zoom' })
    expect(gestures[1]!.zoom).toBeGreaterThan(1)

    // =====================================================================
    // A zoom by the code is a gesture too. The shapes out of the view are counted
    // =====================================================================

    frames.length = 0
    // the view fits the shape a: the two others are out of it
    getPaint().actions.zoomToShapes(['a'])
    await waitFor(() => expect(gestures).toHaveLength(3))
    expect(gestures[2]).toMatchObject({ type: 'zoom' })
    const lastShapesFrame = frames.filter(frame => frame.layer === 'shapes').at(-1)!
    expect(lastShapesFrame.culledShapes).toBe(2)
    expect(lastShapesFrame.drawnShapes).toBe(1)

    // =====================================================================
    // Without listener, nothing is measured
    // =====================================================================

    stop()
    const frameCount = frames.length
    getPaint().actions.resetZoom()
    await wait(200)
    expect(gestures).toHaveLength(3)
    expect(frames).toHaveLength(frameCount)
  }
}
