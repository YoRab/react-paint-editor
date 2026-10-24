import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape, Point } from '../../../src/index'
import { getPaint, getState, makeCoordConverters, ReactPaintWrapper } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const STYLE = { strokeColor: '#000000', opacity: 100, lineWidth: 2 }

// A filled 200×200 rect in front of a filled 100×100 rect, which it covers: both are centered at canvas (300, 300)
const FRONT_RECT: DrawableShape = { type: 'rect', x: 200, y: 200, width: 200, height: 200, rotation: 0, style: { ...STYLE, fillColor: '#e74c3c' } }
const BACK_RECT: DrawableShape = { type: 'rect', x: 250, y: 250, width: 100, height: 100, rotation: 0, style: { ...STYLE, fillColor: '#4a90d9' } }

const getX = (id: string) => (getPaint().getShape(id) as { x: number }).x

export const OverlappingShapes: Story = {
  args: {
    shapes: [FRONT_RECT, BACK_RECT]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()

    const move = async ([x, y]: Point) => {
      await user.pointer({ target: drawCanvas, coords: { x: toClientX(x), y: toClientY(y) } })
    }
    const click = async ([x, y]: Point) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(x), y: toClientY(y) } })
    }
    const drag = async (from: Point, to: Point) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(from[0]), y: toClientY(from[1]) } })
      await move([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2])
      await move(to)
      await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(to[0]), y: toClientY(to[1]) } })
    }

    const [frontId, backId] = getState().shapes.map(shape => shape.id) as [string, string]

    // a click selects the shape in front
    await click([300, 300])
    expect(getState().selectedShapeIds).toEqual([frontId])

    // the shape behind, selected from the code or the layers, is moved by a drag in its selection frame
    getPaint().actions.selectShapes([backId])
    await drag([300, 300], [340, 300])
    expect(getX(backId)).toBe(290)
    expect(getX(frontId)).toBe(200)
    expect(getState().selectedShapeIds).toEqual([backId])

    // there, the shape in front is hovered, and a click selects it
    await move([341, 300])
    expect(getState().interaction.hoveredShape?.id).toBe(frontId)
    await click([340, 300])
    expect(getState().selectedShapeIds).toEqual([frontId])

    // Shift+click adds the shape in front to the selection, then removes it
    getPaint().actions.selectShapes([backId])
    await user.keyboard('{Shift>}')
    await click([340, 300])
    expect(getState().selectedShapeIds).toEqual([backId, frontId])
    await click([340, 300])
    expect(getState().selectedShapeIds).toEqual([backId])
    await user.keyboard('{/Shift}')
  }
}
