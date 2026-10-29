import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import { getPaint, getRootIds, getState, makeCoordConverters, ReactPaintWrapper } from './../helpers'

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

// two filled 100×100 squares, centers at canvas (300, 300) and (600, 300)
const LEFT_SQUARE: DrawableShape = { type: 'square', x: 250, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }
const RIGHT_SQUARE: DrawableShape = { type: 'square', x: 550, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }

const getPosition = (id: string) => {
  const { x, y } = getPaint().getShape(id) as { x: number; y: number }
  return [x, y]
}

export const Keyboard: Story = {
  args: {
    shapes: [LEFT_SQUARE, RIGHT_SQUARE],
    options: { canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()

    // --- Select the left square: the canvas gets the focus ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    const [leftId, rightId] = getState().shapes.map(shape => shape.id) as [string, string]
    expect(getState().selectedShapeIds).toEqual([leftId])

    // =====================================================================
    // A move made with the arrows is a single step of the history, saved when the last arrow is released
    // =====================================================================

    let dataChangedCount = 0
    const unregister = getPaint().registerEvent('dataChanged', () => {
      dataChangedCount++
    })

    // the key repeats while it is held
    await user.keyboard('{ArrowRight>5}')
    expect(getPosition(leftId)).toEqual([255, 250])
    expect(getState().history.canUndo).toBe(false)
    expect(dataChangedCount).toBe(0)
    await user.keyboard('{/ArrowRight}')
    expect(getState().history.canUndo).toBe(true)
    expect(dataChangedCount).toBe(1)

    // an arrow pressed during the move continues it
    await user.keyboard('{ArrowRight>}{ArrowDown>3}{/ArrowRight}')
    expect(getPosition(leftId)).toEqual([256, 253])
    expect(dataChangedCount).toBe(1)
    await user.keyboard('{/ArrowDown}')
    expect(dataChangedCount).toBe(2)

    // the keys released outside of the scope are not received: the move ends when the focus leaves it
    await user.keyboard('{ArrowLeft>2}')
    drawCanvas.blur()
    expect(dataChangedCount).toBe(3)
    await user.keyboard('{/ArrowLeft}')
    drawCanvas.focus()
    unregister()

    // each move is undone at once
    await user.keyboard('{Control>}z{/Control}')
    expect(getPosition(leftId)).toEqual([256, 253])
    await user.keyboard('{Control>}z{/Control}')
    expect(getPosition(leftId)).toEqual([255, 250])
    await user.keyboard('{Control>}z{/Control}')
    expect(getPosition(leftId)).toEqual([250, 250])
    expect(getState().history.canUndo).toBe(false)
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}')
    expect(getPosition(leftId)).toEqual([255, 250])
    await user.keyboard('{Control>}z{/Control}')
    // the first step of the history has no selection
    getPaint().actions.selectShapes([leftId])

    // =====================================================================
    // Arrows move the selection by 1, or by the gap of the grid
    // =====================================================================

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowDown}')
    expect(getPosition(leftId)).toEqual([251, 251])
    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowUp}')
    expect(getPosition(leftId)).toEqual([250, 250])

    // the shape lands on the grid
    getPaint().actions.setGridGap(20)
    await user.keyboard('{ArrowRight}')
    expect(getPosition(leftId)[0]).toBe(280)
    await user.keyboard('{ArrowLeft}')
    expect(getPosition(leftId)[0]).toBe(260)
    getPaint().actions.setGridGap(0)

    // =====================================================================
    // Ctrl+A selects all the shapes, Delete and Backspace remove the selection
    // =====================================================================

    await user.keyboard('{Control>}a{/Control}')
    expect(getState().selectedShapeIds).toEqual([leftId, rightId])
    await user.keyboard('{Delete}')
    expect(getState().shapes).toHaveLength(0)

    // =====================================================================
    // Undo and redo: Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y
    // =====================================================================

    await user.keyboard('{Control>}z{/Control}')
    expect(getState().shapes).toHaveLength(2)
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}')
    expect(getState().shapes).toHaveLength(0)
    await user.keyboard('{Control>}z{/Control}')
    expect(getState().shapes).toHaveLength(2)
    // macOS only redoes with Cmd+Shift+Z
    if (!navigator.userAgent.includes('Macintosh')) {
      await user.keyboard('{Control>}y{/Control}')
      expect(getState().shapes).toHaveLength(0)
      await user.keyboard('{Control>}z{/Control}')
      expect(getState().shapes).toHaveLength(2)
    }

    getPaint().actions.selectShapes([rightId])
    await user.keyboard('{Backspace}')
    expect(getState().shapes.map(shape => shape.id)).toEqual([leftId])
    await user.keyboard('{Control>}z{/Control}')
    expect(getState().shapes).toHaveLength(2)

    // =====================================================================
    // Ctrl+G groups the selection and Ctrl+Shift+G ungroups it, each in a step of the history
    // =====================================================================

    await user.keyboard('{Control>}a{/Control}')
    await user.keyboard('{Control>}g{/Control}')
    const [groupId] = getRootIds()
    expect(getPaint().getShape(groupId!)).toMatchObject({ type: 'group', shapes: [{ id: leftId }, { id: rightId }] })
    expect(getState().selectedShapeIds).toEqual([groupId])
    await user.keyboard('{Control>}{Shift>}G{/Shift}{/Control}')
    expect(getRootIds()).toEqual([leftId, rightId])
    expect(getState().selectedShapeIds).toEqual([leftId, rightId])
    await user.keyboard('{Control>}z{/Control}')
    expect(getRootIds()).toEqual([groupId])
    await user.keyboard('{Control>}z{/Control}')
    expect(getRootIds()).toEqual([leftId, rightId])
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}')
    expect(getRootIds()).toEqual([groupId])
    await user.keyboard('{Control>}z{/Control}')

    // =====================================================================
    // Escape clears the selection
    // =====================================================================

    await user.keyboard('{Control>}a{/Control}')
    expect(getState().selectedShapeIds).toHaveLength(2)
    await user.keyboard('{Escape}')
    expect(getState().selectedShapeIds).toEqual([])
    expect(getState().activeTool.id).toBe('react-paint-selection')

    // =====================================================================
    // Ctrl++ zooms, Ctrl+- unzooms, Ctrl+0 resets the zoom
    // =====================================================================

    await user.keyboard('{Control>}+{/Control}')
    expect(getState().view.zoom).toBe(2)
    await user.keyboard('{Control>}-{/Control}')
    expect(getState().view.zoom).toBe(1)
    await user.keyboard('{Control>}+{/Control}')
    await user.keyboard('{Control>}0{/Control}')
    expect(getState().view).toMatchObject({ zoom: 1, offset: [0, 0] })

    // =====================================================================
    // Shift, Alt and Space are held until they are released
    // =====================================================================

    await user.keyboard('{Shift>}')
    await user.keyboard('{Alt>}')
    await user.keyboard('[Space>]')
    expect(getState().interaction.modifiers).toEqual({ shift: true, alt: true, space: true })

    await user.keyboard('{/Shift}')
    expect(getState().interaction.modifiers).toEqual({ shift: false, alt: true, space: true })
    await user.keyboard('{/Alt}')
    await user.keyboard('[/Space]')
    expect(getState().interaction.modifiers).toEqual({ shift: false, alt: false, space: false })
  }
}
