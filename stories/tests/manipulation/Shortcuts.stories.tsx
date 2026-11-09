import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape, ShapeEntity } from '../../../src/index'
import { getPaint, getRootIds, getSelectedIds, getState, makeCoordConverters, ReactPaintWrapper, selectTool, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation/Shortcuts',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const STYLE = { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }

// two filled 100×100 squares, centers at canvas (300, 300) and (600, 300), and a line under them
const LEFT_SQUARE: DrawableShape = { type: 'square', x: 250, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }
const RIGHT_SQUARE: DrawableShape = { type: 'square', x: 550, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }
const LINE: DrawableShape = {
  type: 'line',
  points: [
    [100, 450],
    [300, 500]
  ],
  rotation: 0,
  style: STYLE
}

const getPosition = (id: string) => {
  const { x, y } = getPaint().getShape(id) as { x: number; y: number }
  return [x, y]
}

const getPoints = (id: string) => (getPaint().getShape(id) as ShapeEntity<'line' | 'polygon'>).points

/** A key of an AZERTY keyboard: its character is not the one of its physical key on a QWERTY one */
const pressAzerty = (target: EventTarget, init: KeyboardEventInit) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  target.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...init }))
}

export const EditingShortcuts: Story = {
  args: {
    shapes: [LEFT_SQUARE, RIGHT_SQUARE, LINE],
    options: { canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()

    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    const [leftId, rightId, lineId] = getRootIds() as [string, string, string]
    expect(getState().selectedShapeIds).toEqual([leftId])

    // =====================================================================
    // Ctrl+D duplicates the selection, a little further, and selects the copy
    // =====================================================================

    await user.keyboard('{Control>}d{/Control}')
    expect(getRootIds()).toHaveLength(4)
    const [copyId] = getState().selectedShapeIds as [string]
    expect(copyId).not.toBe(leftId)
    expect(getPosition(copyId)).not.toEqual(getPosition(leftId))
    await user.keyboard('{Control>}z{/Control}')
    expect(getRootIds()).toEqual([leftId, rightId, lineId])

    // =====================================================================
    // Ctrl+] and Ctrl+[ move the selection forward and backward, with Shift to the foreground and to the background
    // =====================================================================

    getPaint().actions.selectShapes([rightId])
    await user.keyboard('{Control>}]{/Control}')
    expect(getRootIds()).toEqual([rightId, leftId, lineId])
    await user.keyboard('{Control>}[[{/Control}')
    expect(getRootIds()).toEqual([leftId, rightId, lineId])
    await user.keyboard('{Control>}{Shift>}[[{/Shift}{/Control}')
    expect(getRootIds()).toEqual([leftId, lineId, rightId])
    await user.keyboard('{Control>}{Shift>}]{/Shift}{/Control}')
    expect(getRootIds()).toEqual([rightId, leftId, lineId])
    // the physical key is read: the character changes with the layout
    pressAzerty(drawCanvas, { key: '$', code: 'BracketRight', ctrlKey: true })
    expect(getRootIds()).toEqual([rightId, leftId, lineId])
    pressAzerty(drawCanvas, { key: 'Dead', code: 'BracketLeft', ctrlKey: true })
    expect(getRootIds()).toEqual([leftId, rightId, lineId])

    // =====================================================================
    // Ctrl+Shift+L locks and unlocks the selection, Ctrl+Shift+H hides and shows it
    // =====================================================================

    await user.keyboard('{Control>}{Shift>}L{/Shift}{/Control}')
    expect(getPaint().getShape(rightId)?.locked).toBe(true)
    await user.keyboard('{Control>}{Shift>}L{/Shift}{/Control}')
    expect(getPaint().getShape(rightId)?.locked).toBe(false)
    await user.keyboard('{Control>}{Shift>}H{/Shift}{/Control}')
    expect(getPaint().getShape(rightId)?.visible).toBe(false)
    await user.keyboard('{Control>}{Shift>}H{/Shift}{/Control}')
    expect(getPaint().getShape(rightId)?.visible).not.toBe(false)

    // =====================================================================
    // Shift+H flips the selection horizontally, Shift+V vertically, but not a locked one
    // =====================================================================

    getPaint().actions.selectShapes([lineId])
    await user.keyboard('{Shift>}H{/Shift}')
    expect(getPoints(lineId)).toEqual([
      [300, 450],
      [100, 500]
    ])
    await user.keyboard('{Shift>}V{/Shift}')
    expect(getPoints(lineId)).toEqual([
      [300, 500],
      [100, 450]
    ])
    getPaint().actions.setShapesLocked([lineId], true)
    await user.keyboard('{Shift>}H{/Shift}')
    expect(getPoints(lineId)).toEqual([
      [300, 500],
      [100, 450]
    ])
    getPaint().actions.setShapesLocked([lineId], false)

    // =====================================================================
    // Shift+1 fits the drawing in the view, Shift+2 the selection
    // =====================================================================

    getPaint().actions.selectShapes([rightId])
    await user.keyboard('{Shift>}[Digit1]{/Shift}')
    const fitZoom = getState().view.zoom
    expect(fitZoom).not.toBe(1)
    await user.keyboard('{Shift>}[Digit2]{/Shift}')
    expect(getState().view.zoom).toBeGreaterThan(fitZoom)

    // =====================================================================
    // Ctrl+= zooms like Ctrl++, and Ctrl+0 resets the zoom on an AZERTY keyboard, where the key gives 'à'
    // =====================================================================

    await user.keyboard('{Control>}0{/Control}')
    expect(getState().view.zoom).toBe(1)
    await user.keyboard('{Control>}={/Control}')
    expect(getState().view.zoom).toBe(2)
    pressAzerty(drawCanvas, { key: 'à', code: 'Digit0', ctrlKey: true })
    expect(getState().view).toMatchObject({ zoom: 1, offset: [0, 0] })
  }
}

export const EscapeCancelsGesture: Story = {
  args: {
    shapes: [LEFT_SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    const [squareId] = getRootIds() as [string]

    // --- A move is cancelled: the shape goes back, still selected, and nothing is saved ---
    await user.pointer([
      { target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(300), y: toClientY(300) } },
      { coords: { x: toClientX(400), y: toClientY(350) } }
    ])
    expect(getPosition(squareId)).toEqual([350, 300])
    await user.keyboard('{Escape}')
    expect(getPosition(squareId)).toEqual([250, 250])
    expect(getState().selectedShapeIds).toEqual([squareId])
    // the pointer released afterwards does nothing
    await user.pointer({ keys: '[/MouseLeft]', coords: { x: toClientX(450), y: toClientY(350) } })
    expect(getPosition(squareId)).toEqual([250, 250])
    expect(getState().history.canUndo).toBe(false)

    // --- A shape being drawn is removed ---
    await selectTool(view, 'rect')
    await user.pointer([
      { target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(600), y: toClientY(200) } },
      { coords: { x: toClientX(700), y: toClientY(300) } }
    ])
    expect(getRootIds()).toHaveLength(2)
    await user.keyboard('{Escape}')
    expect(getRootIds()).toEqual([squareId])
    expect(getState().selectedShapeIds).toEqual([])
    await user.pointer({ keys: '[/MouseLeft]', coords: { x: toClientX(700), y: toClientY(300) } })
    expect(getRootIds()).toEqual([squareId])
    expect(getState().history.canUndo).toBe(false)

    // --- Without a gesture, Escape still clears the selection ---
    getPaint().actions.selectShapes([squareId])
    await user.keyboard('{Escape}')
    expect(getState().selectedShapeIds).toEqual([])
  }
}

export const DrawingKeys: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    const click = async (x: number, y: number) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(x), y: toClientY(y) } })
      // the next click is not a double click
      await wait(550)
    }

    // =====================================================================
    // While a polygon is drawn, Backspace removes its last point and Enter ends it
    // =====================================================================

    await selectTool(view, 'polygon')
    await click(200, 200)
    await click(400, 200)
    await click(300, 400)
    const [polygonId] = getRootIds() as [string]
    expect(getPoints(polygonId)).toHaveLength(3)
    await user.keyboard('{Backspace}')
    expect(getRootIds()).toEqual([polygonId])
    expect(getPoints(polygonId)).toEqual([
      [200, 200],
      [400, 200]
    ])
    expect(getState().interaction.mode).toBe('preview')

    await user.keyboard('{Enter}')
    expect(getState().interaction.mode).toBe('default')
    expect(getState().activeTool.id).toBe('react-paint-selection')
    expect(getState().selectedShapeIds).toEqual([polygonId])
    expect(getPoints(polygonId)).toHaveLength(2)

    // --- A polygon of a single point draws nothing: Escape, Enter and Backspace remove it ---
    await selectTool(view, 'polygon')
    await click(600, 200)
    expect(getRootIds()).toHaveLength(2)
    await user.keyboard('{Enter}')
    expect(getRootIds()).toEqual([polygonId])
    await selectTool(view, 'polygon')
    await click(600, 200)
    await user.keyboard('{Backspace}')
    expect(getRootIds()).toEqual([polygonId])
    expect(getState().interaction.mode).toBe('default')
    await selectTool(view, 'polygon')
    await click(600, 200)
    expect(getRootIds()).toHaveLength(2)
    await user.keyboard('{Escape}')
    expect(getRootIds()).toEqual([polygonId])
    expect(getSelectedIds()).toEqual([])

    // =====================================================================
    // With Shift, a line drawn and a new side of a polygon take a regular angle
    // =====================================================================

    await selectTool(view, 'line')
    await user.keyboard('{Shift>}')
    await user.pointer([
      { target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(100), y: toClientY(500) } },
      { coords: { x: toClientX(300), y: toClientY(512) } },
      { keys: '[/MouseLeft]' }
    ])
    await user.keyboard('{/Shift}')
    const [lineId] = getRootIds() as [string]
    const [[x1, y1], [x2, y2]] = getPoints(lineId) as [[number, number], [number, number]]
    expect(y2).toBeCloseTo(y1, 1)
    expect(x2).toBeGreaterThan(x1)

    await selectTool(view, 'polygon')
    await click(600, 300)
    await user.keyboard('{Shift>}')
    await click(700, 395)
    await user.keyboard('{/Shift}')
    const [, [px, py]] = getPoints(getRootIds()[0]!) as [[number, number], [number, number]]
    // 43.5° goes to 45°
    expect(px - 600).toBeCloseTo(py - 300, 1)
    await user.keyboard('{Enter}')
  }
}
