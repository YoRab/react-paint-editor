import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import { dispatchTouch, getPaint, getPixel, getState, ReactPaintWrapper, selectTool, toClient, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The eraser removes the shapes its stroke crosses, faded until it is released, except the locked ones; Escape cancels it.
 * The laser pointer draws a trail of the color and the width of the options over the drawing, which fades out without
 * changing it
 */
export const EraserAndLaser: Story = {
  args: { editorOptions: { withEraser: true, withLaser: true }, canvasOptions: { canvasLaserColor: 'blue', canvasLaserWidth: 12 } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
    const selectionCanvas = canvasElement.querySelector<HTMLCanvasElement>('.react-paint-canvas-selectioncanvas')!
    const { actions } = getPaint()

    const [filled, outlined, locked, line] = actions.addShapes([
      { type: 'rect', x: 100, y: 100, width: 150, height: 100, style: { fillColor: 'red', strokeColor: 'transparent', opacity: 100 } },
      { type: 'rect', x: 400, y: 100, width: 150, height: 100, style: { fillColor: 'transparent', strokeColor: 'black', lineWidth: 2 } },
      { type: 'rect', x: 700, y: 100, width: 150, height: 100, style: { fillColor: 'blue', strokeColor: 'transparent' } },
      {
        type: 'line',
        points: [
          [100, 400],
          [300, 400]
        ],
        style: { strokeColor: 'black', lineWidth: 4 }
      }
    ])
    actions.setShapesLocked([locked!], true)
    await wait(100)

    // a single move crosses the three rects: the two which are not locked are faded until the release
    await selectTool(view, 'eraser')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient([50, 150]) })
    await user.pointer({ target: drawCanvas, coords: toClient([950, 150]) })
    await wait(100)
    expect(getState().interaction.mode).toBe('eraser')
    expect(getState().shapes).toHaveLength(4)
    const fadedAlpha = getPixel(drawCanvas, [175, 120])[3]!
    expect(fadedAlpha).toBeGreaterThan(60)
    expect(fadedAlpha).toBeLessThan(95)
    expect(getPixel(drawCanvas, [775, 120])).toEqual([0, 0, 255, 255])

    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient([950, 150]) })
    await wait(100)
    expect(getState().shapes.map(shape => shape.id)).toEqual([locked, line])
    expect(getPixel(drawCanvas, [175, 120])[3]).toBe(0)
    // the eraser stays the tool, and its stroke is a single step of the history
    expect(getState().activeTool.id).toBe('react-paint-eraser')
    actions.undo()
    expect(getState().shapes.map(shape => shape.id)).toEqual([filled, outlined, locked, line])
    actions.redo()

    // Escape cancels the stroke: the line it pressed is kept, and drawn again as it was
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient([200, 400]) })
    await wait(100)
    expect(getPixel(drawCanvas, [200, 400])[3]).toBeLessThan(95)
    await user.keyboard('{Escape}')
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient([200, 400]) })
    await wait(100)
    expect(getState().shapes.map(shape => shape.id)).toEqual([locked, line])
    expect(getPixel(drawCanvas, [200, 400])[3]).toBeGreaterThan(250)

    // so does a second finger, which starts a pinch
    const touch = (type: 'pointerdown' | 'pointerup', pointerId: number, point: Point) => dispatchTouch(drawCanvas, type, pointerId, toClient(point))
    touch('pointerdown', 11, [200, 400])
    await wait(50)
    expect(getState().interaction.mode).toBe('eraser')
    touch('pointerdown', 12, [600, 400])
    expect(getState().interaction.mode).toBe('default')
    touch('pointerup', 11, [200, 400])
    touch('pointerup', 12, [600, 400])
    await wait(100)
    expect(getState().shapes.map(shape => shape.id)).toEqual([locked, line])

    // the laser draws over the drawing, without any shape nor step of the history
    const { history } = getState()
    await selectTool(view, 'laser')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient([100, 500]) })
    await user.pointer({ target: drawCanvas, coords: toClient([400, 500]) })
    await wait(50)
    expect(getState().interaction.mode).toBe('laser')
    expect(getPixel(selectionCanvas, [250, 500])).toEqual([0, 0, 255, 255])
    // about 10 pixels wide, 6 by default
    expect(getPixel(selectionCanvas, [250, 504])).toEqual([0, 0, 255, 255])
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient([400, 500]) })
    expect(getState().shapes.map(shape => shape.id)).toEqual([locked, line])
    expect(getState().history).toBe(history)

    // the trail is gone a second after its last point
    await wait(1200)
    expect(getPixel(selectionCanvas, [250, 500])[3]).toBe(0)
    expect(getState().activeTool.id).toBe('react-paint-laser')
  }
}
