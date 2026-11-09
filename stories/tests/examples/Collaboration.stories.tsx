import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { ReactPaint } from '../../../src/index'
import { Collaboration, collaborationPaints } from '../../examples/use-cases/Collaboration'
import { findFileInput, makeCoordConverters, selectTool, wait } from '../helpers'

const meta = {
  title: 'Tests/Examples/Collaboration',
  component: Collaboration,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof Collaboration>

export default meta
type Story = StoryObj<typeof meta>

const getPaints = () => {
  const { alice, bob } = collaborationPaints
  if (!alice || !bob) throw new Error('The collaboration is not rendered')
  return { alice, bob }
}

const getRootIds = (paint: ReactPaint) => paint.getState().shapes.map(shape => shape.id)

const expectSameDrawing = () => {
  const { alice, bob } = getPaints()
  expect(bob.getCurrentData()).toEqual(alice.getCurrentData())
}

/** The view and the draw canvas of a user, with the converters of the logical coordinates of the drawing */
const getUser = async (canvasElement: HTMLElement, name: string) => {
  const view = within(await within(canvasElement).findByRole('region', { name }))
  const drawCanvas = await view.findByTestId('draw-canvas')
  return { view, drawCanvas, ...makeCoordConverters(drawCanvas.getBoundingClientRect()) }
}

export const RealTimeCollaboration: Story = {
  args: { latency: 0 },
  play: async ({ canvasElement }) => {
    const user = userEvent.setup()
    const alice = await getUser(canvasElement, 'Alice')
    const bob = await getUser(canvasElement, 'Bob')
    await waitFor(() => expect(getRootIds(getPaints().alice)).toEqual(['box', 'sun', 'title']))
    await waitFor(() => expect(getRootIds(getPaints().bob)).toEqual(['box', 'sun', 'title']))

    // --- A rectangle drawn by Alice is drawn for Bob, with the same id ---
    await selectTool(alice.view, 'rect')
    await user.pointer({ target: alice.drawCanvas, keys: '[MouseLeft>]', coords: { x: alice.toClientX(80), y: alice.toClientY(400) } })
    await user.pointer({ target: alice.drawCanvas, coords: { x: alice.toClientX(260), y: alice.toClientY(520) } })
    await user.pointer({ target: alice.drawCanvas, keys: '[/MouseLeft]', coords: { x: alice.toClientX(260), y: alice.toClientY(520) } })
    await wait(100)
    const [drawnId] = getRootIds(getPaints().alice)
    expect(drawnId).toMatch(/^rect_/)
    expect(getRootIds(getPaints().bob)[0]).toBe(drawnId)
    expectSameDrawing()

    // --- While Alice drags the box, it moves for Bob before she releases it, and Bob saves the move on release ---
    const bobSteps = fn()
    const unregisterBobSteps = getPaints().bob.registerEvent('dataChanged', bobSteps)
    await user.pointer({ target: alice.drawCanvas, keys: '[MouseLeft>]', coords: { x: alice.toClientX(230), y: alice.toClientY(190) } })
    await user.pointer({ target: alice.drawCanvas, coords: { x: alice.toClientX(280), y: alice.toClientY(190) } })
    await user.pointer({ target: alice.drawCanvas, coords: { x: alice.toClientX(330), y: alice.toClientY(190) } })
    await wait(50)
    expect((getPaints().bob.getShape('box') as { x: number }).x).toBeCloseTo(220, 0)
    expect(bobSteps).not.toHaveBeenCalled()
    await user.pointer({ target: alice.drawCanvas, keys: '[/MouseLeft]', coords: { x: alice.toClientX(330), y: alice.toClientY(190) } })
    await wait(100)
    expectSameDrawing()
    // a step of Bob's history, received
    expect(bobSteps).toHaveBeenCalledTimes(1)
    expect(bobSteps.mock.calls[0]![1]).toBe('remote')
    unregisterBobSteps()

    // --- The move is a step of Alice only: Bob's undo changes nothing ---
    expect(getPaints().bob.getState().history.canUndo).toBe(false)
    bob.drawCanvas.focus()
    await user.keyboard('{Control>}z{/Control}')
    await wait(100)
    expect((getPaints().bob.getShape('box') as { x: number }).x).toBeCloseTo(220, 0)

    // --- Bob moves the sun, then Alice undoes her move: the box comes back for both, the sun stays moved ---
    const getSunY = (paint: ReactPaint) => (paint.getShape('sun') as { y: number }).y
    getPaints().bob.actions.translateShapes(['sun'], [0, 40])
    alice.drawCanvas.focus()
    await user.keyboard('{Control>}z{/Control}')
    await wait(100)
    expect(getPaints().bob.getShape('box')).toMatchObject({ x: 120 })
    expect(getSunY(getPaints().alice)).toBe(260)
    expectSameDrawing()

    // --- Bob undoes his move: the sun comes back for both ---
    bob.drawCanvas.focus()
    await user.keyboard('{Control>}z{/Control}')
    await wait(100)
    expect(getSunY(getPaints().alice)).toBe(220)
    expectSameDrawing()

    // --- Alice groups the box and the sun with Ctrl+G: Bob has the group ---
    getPaints().alice.actions.selectShapes(['box', 'sun'])
    alice.drawCanvas.focus()
    await user.keyboard('{Control>}g{/Control}')
    await wait(100)
    const groupId = getRootIds(getPaints().alice).find(id => id.startsWith('group'))
    expect(groupId).toBeDefined()
    expect(getRootIds(getPaints().bob)).toContain(groupId)
    expectSameDrawing()

    // --- Bob removes the rectangle drawn by Alice: it is removed for her too ---
    getPaints().bob.actions.selectShapes([drawnId!])
    bob.drawCanvas.focus()
    await user.keyboard('{Delete}')
    await wait(100)
    expect(getRootIds(getPaints().alice)).not.toContain(drawnId)
    expectSameDrawing()

    // --- Alice chooses a grid: Bob has it, and does not send it back ---
    const aliceGrids = fn()
    const unregisterAliceGrids = getPaints().alice.registerEvent('gridChanged', aliceGrids)
    await user.click(await alice.view.findByRole('button', { name: 'Toggle layers panel' }))
    await user.click(await alice.view.findByRole('button', { name: /^M, / }))
    expect(getPaints().bob.getState().gridGap).toBe(20)
    expect(aliceGrids.mock.calls).toEqual([[20]])
    unregisterAliceGrids()

    // --- Bob removes the grid: Alice has no grid ---
    await user.click(await bob.view.findByRole('button', { name: 'Toggle layers panel' }))
    await user.click(await bob.view.findByRole('button', { name: 'No grid' }))
    expect(getPaints().alice.getState().gridGap).toBe(0)

    // --- Alice zooms with the panel of her editor: Bob's view does not change ---
    await user.click(await alice.view.findByRole('button', { name: 'Zoom in' }))
    expect(getPaints().alice.getState().view.zoom).toBe(2)
    expect(getPaints().bob.getState().view.zoom).toBe(1)

    // --- A shape far outside the first view, drawn by Bob, is drawn for Alice, who zooms and scrolls to it ---
    getPaints().bob.actions.addShapes([{ type: 'rect', id: 'far', x: 4000, y: -2500, width: 300, height: 200 }])
    await wait(100)
    expect(getRootIds(getPaints().alice)).toContain('far')
    expectSameDrawing()
    getPaints().alice.actions.zoomToShapes(['far'])
    await wait(50)
    const { visibleArea } = getPaints().alice.getState().view
    expect(visibleArea.x).toBeLessThan(4000)
    expect(visibleArea.x + visibleArea.width).toBeGreaterThan(4300)
    expect(getPaints().bob.getState().view).toMatchObject({ zoom: 1, offset: [0, 0] })
    getPaints().alice.actions.resetZoom()

    // --- Alice loads a project from the menu: Bob has its drawing ---
    const project = { shapes: [{ type: 'rect', id: 'loaded', x: 40, y: 40, width: 200, height: 100, style: { strokeColor: '#ef476f' } }] }
    await user.click(await alice.view.findByTitle('Menu'))
    await user.upload(
      await findFileInput(alice.view, 'Load project'),
      new File([JSON.stringify(project)], 'project.json', { type: 'application/json' })
    )
    await waitFor(() => expect(getRootIds(getPaints().alice)).toEqual(['loaded']))
    await waitFor(() => expect(getRootIds(getPaints().bob)).toEqual(['loaded']))
    expectSameDrawing()
  }
}

export const CollaborationGridWithLatency: Story = {
  args: { latency: 50 },
  play: async () => {
    await waitFor(() => expect(getRootIds(getPaints().bob)).toEqual(['box', 'sun', 'title']))
    await wait(50)
    const { alice, bob } = getPaints()
    const aliceGrids = fn()
    const unregisterAliceGrids = alice.registerEvent('gridChanged', aliceGrids)
    // a second grid chosen before the first one is received: the grids received are not sent back, so they do not bounce
    alice.actions.setGridGap(20)
    alice.actions.setGridGap(40)
    await wait(400)
    expect(bob.getState().gridGap).toBe(40)
    expect(alice.getState().gridGap).toBe(40)
    expect(aliceGrids.mock.calls).toEqual([[20], [40]])
    unregisterAliceGrids()
  }
}
