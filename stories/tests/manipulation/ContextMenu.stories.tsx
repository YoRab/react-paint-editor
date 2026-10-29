import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape, Point } from '../../../src/index'
import { getCurrentDataRef, getRootIds, getState, makeCoordConverters, ReactPaintWrapper, selectTool, toClient, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// 100×100 filled square, center at canvas (300, 300).
const SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: { fillColor: 'red', strokeColor: 'black', lineWidth: 1, opacity: 100, lineDash: 0, closedPoints: 0 }
}

export const ContextMenuAfterToolbarSelection: Story = {
  args: {
    shapes: [SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    await new Promise(res => setTimeout(res, 100))

    // --- Go back to the selection tool from the toolbar ---
    await selectTool(view, 'rect')
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(700), y: toClientY(500) } })
    await new Promise(res => setTimeout(res, 100))

    // --- A single right click on the square opens the context menu ---
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))
    const duplicateButton = view.queryByRole('button', { name: 'Duplicate' })
    expect(duplicateButton).not.toBeNull()

    await userEvent.click(duplicateButton!)
    await new Promise(res => setTimeout(res, 100))
    expect(getCurrentDataRef.current!().shapes).toHaveLength(2)
  }
}

/**
 * The context menu groups the selected shapes, and ungroups the selected groups: its entries are disabled when they do
 * nothing. Opened at the bottom of the window, the menu with all its entries stays in the window
 */
export const ContextMenuGroups: Story = {
  args: {
    // two squares at the bottom of the drawing, centered at (200, 500) and (500, 500)
    shapes: [
      { ...SQUARE, id: 'left', x: 150, y: 450 },
      { ...SQUARE, id: 'right', x: 450, y: 450 }
    ]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    await wait(100)

    const openContextMenu = async (point: Point) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: toClient(point) })
      await wait(100)
    }

    // a single shape is neither grouped nor ungrouped
    await openContextMenu([200, 500])
    expect(getState().selectedShapeIds).toEqual(['left'])
    expect(view.getByRole('button', { name: 'Group' })).toBeDisabled()
    expect(view.getByRole('button', { name: 'Ungroup' })).toBeDisabled()
    await user.click(view.getByRole('button', { name: 'Select all' }))

    // the selected shapes are grouped, and the group is selected
    await openContextMenu([200, 500])
    const menu = canvasElement.querySelector('.react-paint-editor-toolbox-contextmenu')!
    expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
    expect(view.getByRole('button', { name: 'Ungroup' })).toBeDisabled()
    await user.click(view.getByRole('button', { name: 'Group' }))
    expect(view.queryByRole('button', { name: 'Group' })).toBeNull()
    const [groupId] = getRootIds()
    expect(getRootIds()).toEqual([groupId])
    expect(getState().selectedShapeIds).toEqual([groupId])

    // the group alone cannot be grouped again, it is ungrouped: its shapes are selected
    await openContextMenu([500, 500])
    expect(view.getByRole('button', { name: 'Group' })).toBeDisabled()
    await user.click(view.getByRole('button', { name: 'Ungroup' }))
    expect(getRootIds()).toEqual(['left', 'right'])
    expect(getState().selectedShapeIds).toEqual(['left', 'right'])
  }
}
