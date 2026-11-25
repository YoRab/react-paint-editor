import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point, ShapeEntity, ShapeInput } from '../../../src/index'
import { getPaint, getState, makeCoordConverters, ReactPaintWrapper } from './../helpers'

const meta = {
  title: 'Tests/Manipulation/LinesWithFill',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// a fill color given by the code, which a line and a brush do not draw
const STYLE = { fillColor: '#e74c3c', strokeColor: '#000000', lineWidth: 2 }

// a diagonal line centered at (250, 250), and a straight stroke of a brush, from (600, 300) to (900, 300)
const LINE: ShapeInput = {
  type: 'line',
  points: [
    [100, 400],
    [400, 100]
  ],
  style: STYLE
}
const BRUSH: ShapeInput = {
  type: 'brush',
  points: [
    [
      [600, 300],
      [900, 300]
    ]
  ],
  style: STYLE
}

export const LinesWithFill: Story = {
  args: {
    shapes: [LINE, BRUSH]
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

    const [lineId, brushId] = getState().shapes.map(shape => shape.id) as [string, string]
    const getLinePoints = () => (getPaint().getShape(lineId) as ShapeEntity<'line'>).points

    // a click on the middle of the line selects it
    await click([250, 250])
    expect(getState().selectedShapeIds).toEqual([lineId])

    // a drag from its stroke moves it
    await drag([250, 250], [300, 250])
    expect(getLinePoints()).toEqual([
      [150, 400],
      [450, 100]
    ])

    // a click on the stroke of the brush selects it
    await click([750, 300])
    expect(getState().selectedShapeIds).toEqual([brushId])

    // a selection frame which crosses the line, without holding it, selects it: the line goes through (300, 250)
    await click([500, 550])
    expect(getState().selectedShapeIds).toEqual([])
    await drag([250, 200], [350, 350])
    expect(getState().selectedShapeIds).toEqual([lineId])
  }
}
