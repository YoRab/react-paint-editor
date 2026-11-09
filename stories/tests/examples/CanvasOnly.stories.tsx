import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point } from '../../../src/index'
import { CanvasOnly as CanvasOnlyExample } from '../../examples/custom-ui/CanvasOnly'
import { makeCoordConverters, wait } from '../helpers'

const meta = {
  title: 'Tests/Examples/CanvasOnly',
  component: CanvasOnlyExample,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof CanvasOnlyExample>

export default meta
type Story = StoryObj<typeof meta>

export const CanvasOnly: Story = {
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    const status = await view.findByTestId('status')
    const hovered = await view.findByTestId('hovered')
    const selectionHovered = await view.findByTestId('selection-hover')
    const gesture = await view.findByTestId('gesture')
    await wait(100)

    expect(canvasElement.querySelector('.react-paint-editor-app')).toBeNull()
    expect(status).toHaveTextContent('1 shape(s) - selected: none')

    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const toCoords = ([x, y]: Point) => ({ x: toClientX(x), y: toClientY(y) })

    /** Moves the mouse over a point of the drawing */
    const hover = async (point: Point) => {
      await user.pointer({ target: drawCanvas, coords: toCoords(point) })
      await wait()
    }

    /** Presses the mouse at a point of the drawing, moves it to another one, checks the gesture running, and releases it */
    const drag = async (from: Point, to: Point, expectedGesture: string) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toCoords(from) })
      await wait()
      await hover(to)
      expect(gesture).toHaveTextContent(`gesture: ${expectedGesture}`)
      // nothing is hovered during a gesture
      expect(hovered).toHaveTextContent('hovered: none')
      expect(selectionHovered).toHaveTextContent('selection hovered: none')
      await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toCoords(to) })
      await wait(100)
      expect(gesture).toHaveTextContent('gesture: default')
    }

    // --- The hover works before any click ---
    expect(document.activeElement).not.toBe(drawCanvas)
    await hover([300, 300])
    expect(hovered).toHaveTextContent('hovered: square')
    await hover([100, 100])
    expect(hovered).toHaveTextContent('hovered: none')

    // --- Select and drag the square ---
    expect(gesture).toHaveTextContent('gesture: default')
    await drag([300, 300], [400, 300], 'translate')
    expect(status).toHaveTextContent('1 shape(s) - selected: square at x=350')

    // --- Over the selection, the part under the pointer tells the gesture a press starts ---
    // the hover is searched again on the next move, after the gesture
    await hover([390, 290])
    expect(hovered).toHaveTextContent('hovered: square')
    expect(selectionHovered).toHaveTextContent('selection hovered: translate')
    // the anchors stand out of the square, which is not hovered there
    await hover([400, 212])
    expect(hovered).toHaveTextContent('hovered: none')
    expect(selectionHovered).toHaveTextContent('selection hovered: rotate')
    await hover([457, 357])
    expect(hovered).toHaveTextContent('hovered: none')
    expect(selectionHovered).toHaveTextContent('selection hovered: resize [1, 1]')

    // --- Resize the square from its bottom right anchor, then turn it ---
    await drag([457, 357], [477, 377], 'resize')
    // the square is now 120 wide: the anchor of the rotation stays above its middle
    await hover([410, 212])
    expect(selectionHovered).toHaveTextContent('selection hovered: rotate')
    await drag([410, 212], [520, 310], 'rotate')
    expect(status).toHaveTextContent('1 shape(s) - selected: square at x=350')

    // --- Once the focus is outside, the keyboard shortcuts are off but the hover still works ---
    await user.click(status)
    await wait()
    expect(document.activeElement).not.toBe(drawCanvas)
    await userEvent.keyboard('{Delete}')
    await wait()
    expect(status).toHaveTextContent('1 shape(s) - selected: square at x=350')
    await hover([400, 300])
    expect(hovered).toHaveTextContent('hovered: square')

    // --- Keyboard shortcuts are active once the canvas is clicked ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toCoords([400, 300]) })
    await wait()
    await userEvent.keyboard('{Delete}')
    await wait(100)
    expect(status).toHaveTextContent('0 shape(s) - selected: none')
    // the square removed under the pointer is not hovered anymore
    expect(hovered).toHaveTextContent('hovered: none')

    // --- A press on an empty area draws a selection frame ---
    await drag([100, 100], [200, 200], 'selectionFrame')
  }
}
