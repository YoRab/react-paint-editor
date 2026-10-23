import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape, Point } from '../../../src/index'
import { getPaint, getState, makeCoordConverters, ReactPaintWrapper, selectTool } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const STYLE = { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }

// Two filled 100×100 rects (not squares, which always keep their ratio), centers at canvas (300, 300) and (600, 300).
// The selection has no padding: the anchors are on the corners and the sides of the rect
const LEFT_RECT: DrawableShape = { type: 'rect', x: 250, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }
const RIGHT_RECT: DrawableShape = { type: 'rect', x: 550, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }

const getRect = (id: string) => {
  const { x, y, width, height, rotation } = getPaint().getShape(id) as { x: number; y: number; width: number; height: number; rotation: number }
  return { x, y, width, height, rotation }
}

export const Modifiers: Story = {
  args: {
    shapes: [LEFT_RECT, RIGHT_RECT],
    options: { canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()

    const click = async ([x, y]: Point) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(x), y: toClientY(y) } })
    }
    /** Drags with a button between two points of the canvas, held while keys are held */
    const drag = async (from: Point, to: Point, { keys = '', button = 'MouseLeft' } = {}) => {
      if (keys) await user.keyboard(keys)
      await user.pointer({ target: drawCanvas, keys: `[${button}>]`, coords: { x: toClientX(from[0]), y: toClientY(from[1]) } })
      await user.pointer({ target: drawCanvas, coords: { x: toClientX((from[0] + to[0]) / 2), y: toClientY((from[1] + to[1]) / 2) } })
      await user.pointer({ target: drawCanvas, coords: { x: toClientX(to[0]), y: toClientY(to[1]) } })
      await user.pointer({ target: drawCanvas, keys: `[/${button}]`, coords: { x: toClientX(to[0]), y: toClientY(to[1]) } })
      // the held keys are released
      if (keys) await user.keyboard(keys.replace(/\{(\w+)>\}/g, '{/$1}').replace(/\[(\w+)>\]/g, '[/$1]'))
    }

    await click([300, 300])
    const [leftId, rightId] = getState().shapes.map(shape => shape.id) as [string, string]
    expect(getState().selectedShapeIds).toEqual([leftId])

    /** Undoes the last gesture, which goes back to a step without selection, and selects the left rect again */
    const undo = () => {
      getPaint().actions.undo()
      getPaint().actions.selectShapes([leftId])
    }

    // =====================================================================
    // Resize: Shift keeps the ratio, Alt resizes from the center
    // =====================================================================

    // the bottom right corner goes to (450, 400): the width is followed
    await drag([350, 350], [450, 400], { keys: '{Shift>}' })
    expect(getRect(leftId)).toMatchObject({ x: 250, y: 250, width: 200, height: 200 })
    undo()

    // the right side goes 50 to the right: the left side goes 50 to the left
    await drag([350, 300], [400, 300], { keys: '{Alt>}' })
    expect(getRect(leftId)).toMatchObject({ x: 200, y: 250, width: 200, height: 100 })
    undo()

    // the corner goes twice as far from the center
    await drag([350, 350], [400, 400], { keys: '{Shift>}{Alt>}' })
    expect(getRect(leftId)).toMatchObject({ x: 200, y: 200, width: 200, height: 200 })
    undo()
    expect(getRect(leftId)).toMatchObject({ x: 250, y: 250, width: 100, height: 100 })

    // =====================================================================
    // Rotate: Shift turns by steps of 10°
    // =====================================================================

    // the rotation handle is at (300, 227), 73 from the center: it is turned by about 33°
    await drag([300, 227], [339.8, 238.8], { keys: '{Shift>}' })
    expect(getRect(leftId).rotation).toBeCloseTo(Math.PI / 6, 5)
    undo()

    // =====================================================================
    // Translate: Shift moves along a single axis, Alt moves a copy
    // =====================================================================

    await drag([300, 300], [360, 310], { keys: '{Shift>}' })
    expect(getRect(leftId)).toMatchObject({ x: 310, y: 250 })
    undo()

    await drag([300, 300], [300, 460], { keys: '{Alt>}' })
    const shapes = getState().shapes
    expect(shapes).toHaveLength(3)
    // the original stays, the copy is moved
    expect(shapes.map(shape => (shape as { y: number }).y).sort()).toEqual([250, 250, 410])
    undo()
    expect(getState().shapes).toHaveLength(2)

    // =====================================================================
    // Shift+click adds a shape to the selection, or removes a selected one
    // =====================================================================

    await click([300, 300])
    await user.keyboard('{Shift>}')
    await click([600, 300])
    expect(getState().selectedShapeIds).toEqual([leftId, rightId])
    await click([600, 300])
    expect(getState().selectedShapeIds).toEqual([leftId])
    await user.keyboard('{/Shift}')

    // =====================================================================
    // Pan: Space + drag, the move tool, or the middle button
    // =====================================================================

    getPaint().actions.setZoom('zoom')
    const [startX, startY] = getState().view.offset
    // the zoom is 2: a move of 50 on the canvas moves the drawing by 25
    await drag([500, 300], [450, 300], { keys: '[Space>]' })
    expect(getState().view.offset).toEqual([startX - 25, startY])
    expect(getState().interaction.isPanning).toBe(false)

    await selectTool(view, 'move')
    await drag([500, 300], [500, 250])
    expect(getState().view.offset).toEqual([startX - 25, startY - 25])
    await selectTool(view, 'selection')

    await drag([500, 300], [550, 350], { button: 'MouseMiddle' })
    expect(getState().view.offset).toEqual([startX, startY])

    // =====================================================================
    // A press outside of a drawing smaller than the view clears the selection
    // =====================================================================

    getPaint().actions.zoomTo(0.5)
    getPaint().actions.selectShapes([leftId])
    // position in the view of a point of the drawing
    const { zoom, offset } = getState().view
    const toView = ([x, y]: Point): Point => [(x + offset[0]) * zoom, (y + offset[1]) * zoom]
    const container = canvasElement.querySelector<HTMLElement>('.react-paint-canvas-container')!
    const [cornerX, cornerY] = toView([350, 350])
    // the cursor of a resize anchor is a pointer
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(cornerX), y: toClientY(cornerY) } })
    expect(container.style.cursor).toBe('var(--react-paint-canvas-cursor, pointer)')
    // the anchors are not hovered outside of the drawing
    const outside = toView([-100, -100])
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(outside[0]), y: toClientY(outside[1]) } })
    expect(container.style.cursor).toBe('var(--react-paint-canvas-cursor, default)')
    await click(outside)
    expect(getState().selectedShapeIds).toEqual([])
  }
}
