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

/** The summary of the last gesture: the gesture, its frames and the draws of the layers */
const readGesture = (panel: HTMLElement) => ['Last gesture', 'Its frames', 'Its draws'].map(term => readField(panel, term)).join('\n')

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

/** Replays a gesture with its button, then gives the summary of the gesture measured */
const replay = async ({ view, panel, user }: Awaited<ReturnType<typeof setUp>>, name: string, type: string) => {
  const button = view.getByRole('button', { name })
  const previous = readGesture(panel)
  await user.click(button)
  // the drawing does not change during a replay, and the other replays wait for the end of this one
  expect(view.getByRole('checkbox', { name: '50 % opacity' })).toBeDisabled()
  for (const replayButton of view.getAllByRole('button', { name: /^Replay / })) expect(replayButton).toBeDisabled()
  // 120 frames, and the time of a slower machine
  await waitFor(() => expect(button).toBeEnabled(), { timeout: 8000 })
  await waitFor(() => expect(readGesture(panel)).not.toBe(previous))
  const gesture = readField(panel, 'Last gesture')
  expect(gesture).toMatch(new RegExp(`^${type} · `))
  expect(readGestureFps(panel)).toBeGreaterThan(0)
  return gesture
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

/** The replayed drag and stroke of the brush are measured like the ones of the user */
export const ReplayedPointerGestures: Story = {
  play: async ({ canvasElement }) => {
    const example = await setUp(canvasElement)

    // the shape in the middle of the grid, a brush, is dragged around and back to its place
    expect(await replay(example, 'Replay a drag', 'translate')).toContain('2,000 shapes, 1 selected')
    // each replay starts from the same view: the stroke is drawn in it
    await replay(example, 'Replay a brush stroke', 'brush')
    await waitFor(() => expect(readField(example.panel, 'Shapes')).toBe('2,001 drawn · 0 out of the view · 0 on a layer'))
  }
}

/** The replayed pan and zoom are measured once the view stops changing */
export const ReplayedViewGestures: Story = {
  play: async ({ canvasElement }) => {
    const example = await setUp(canvasElement)
    await replay(example, 'Replay a pan', 'pan')
    await replay(example, 'Replay a zoom', 'zoom')
  }
}

/** At half opacity, the shapes painted in several operations are painted on a layer first. Grouped, they move together */
export const OpacityAndGroups: Story = {
  play: async ({ canvasElement }) => {
    const example = await setUp(canvasElement)
    const { view, panel, user } = example

    // all the shapes but the 250 texts
    await user.click(view.getByRole('checkbox', { name: '50 % opacity' }))
    await waitFor(() => expect(readField(panel, 'Shapes')).toBe('2,000 drawn · 0 out of the view · 1,750 on a layer'))

    // the drag moves the group of the shape
    await user.click(view.getByRole('checkbox', { name: 'Groups of 10' }))
    expect(await replay(example, 'Replay a drag', 'translate')).toContain('2,000 shapes, 10 selected')
  }
}

/** The mix and the number of the shapes change the drawing, the option of the density the size of the canvas */
export const MixAndDensity: Story = {
  play: async ({ canvasElement }) => {
    const example = await setUp(canvasElement)
    const { view, panel, drawCanvas, user } = example

    // a text is grabbed in its box
    await user.selectOptions(view.getByRole('combobox', { name: 'Shapes' }), 'Texts')
    expect(await replay(example, 'Replay a drag', 'translate')).toContain('2,000 shapes, 1 selected')

    // a text of a single line is painted at once, with its opacity
    await user.click(view.getByRole('checkbox', { name: '50 % opacity' }))
    await user.click(view.getByRole('button', { name: '5,000 shapes' }))
    await waitFor(() => expect(readField(panel, 'Shapes')).toBe('5,000 drawn · 0 out of the view · 0 on a layer'))

    // the density of the canvas is bounded by its option
    await user.selectOptions(view.getByRole('combobox', { name: 'Max density' }), '1')
    await waitFor(() => expect(readField(panel, 'Canvas')).toMatch(/ · density 1$/))
    expect(drawCanvas.width).toBe(Math.round(drawCanvas.getBoundingClientRect().width))
  }
}
