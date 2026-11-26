import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Performance as PerformanceExample } from '../../examples/features/Performance'
import { dragRight, makeCoordConverters } from '../helpers'

const meta = {
  title: 'Tests/Examples/Performance',
  component: PerformanceExample,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof PerformanceExample>

export default meta
type Story = StoryObj<typeof meta>

/** The value of a field of the panel, given its term */
const readField = (panel: HTMLElement, term: string) => within(panel).getByText(term).nextElementSibling?.textContent ?? ''

/** The frames per second of the last gesture */
const readGestureFps = (panel: HTMLElement) => Number(/^(\d+) fps /.exec(readField(panel, 'Its frames'))?.[1])

/** The example, once the panel has counted its first frames */
const setUp = async (canvasElement: HTMLElement) => {
  const view = within(canvasElement)
  const panel = await view.findByRole('region', { name: 'Performance' })
  const drawCanvas = (await view.findByTestId('draw-canvas')) as HTMLCanvasElement
  await waitFor(() => expect(readField(panel, 'Frames')).toMatch(/^[1-9]\d* fps · max [1-9]/), { timeout: 3000 })
  return { view, panel, drawCanvas, user: userEvent.setup() }
}

/** The panel counts the frames of the browser, and gives the draws of the layers and the summary of a gesture */
export const Panel: Story = {
  play: async ({ canvasElement }) => {
    const { panel, drawCanvas, user } = await setUp(canvasElement)
    expect(readField(panel, 'Canvas')).toContain(`${drawCanvas.width.toLocaleString('en')} × ${drawCanvas.height.toLocaleString('en')} px`)

    // the first shape of the grid of 2000 shapes is a rectangle in its top left corner
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    await dragRight(user, drawCanvas, { x: toClientX(8), y: toClientY(8) }, 5)

    await waitFor(() => expect(readField(panel, 'Last gesture')).toMatch(/^translate · /))
    expect(readField(panel, 'Last gesture')).toContain('2,000 shapes, 1 selected')
    expect(readGestureFps(panel)).toBeGreaterThan(0)
    expect(readField(panel, 'Its draws')).toMatch(/^shapes [1-9]\d*, worst /)

    // all the shapes are in the view
    await waitFor(() => expect(readField(panel, 'Shapes')).toBe('2,000 drawn · 0 out of the view · 0 on a layer'))
    expect(readField(panel, 'Shapes layer')).toContain('last ')
    expect(readField(panel, 'Selection layer')).toContain('last ')
  }
}
