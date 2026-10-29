import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { Point, ShapeEntity } from '../../../src/index'
import {
  getChildIds,
  getPaint,
  getRootIds,
  getState,
  ReactPaintWrapper,
  setColorSetting,
  setNumberSetting,
  setRangeSetting,
  square,
  toClient,
  wait
} from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/** Longer than a double click: the next click starts a new one */
const DOUBLE_CLICK_DELAY = 350

/** The centers of a and c, a point of the text, and the centers of free and l1 */
const A: Point = [150, 150]
const TEXT: Point = [270, 140]
const C: Point = [450, 150]
const FREE: Point = [700, 150]
const L1: Point = [150, 400]

const getSelectedIds = () => getState().selectedShapeIds
const getHoveredId = () => getState().interaction.hoveredShape?.id
const getPosition = (id: string) => {
  const { x, y } = getPaint().getShape(id) as { x: number; y: number }
  return [x, y]
}

const createGestures = (drawCanvas: HTMLElement) => {
  const user = userEvent.setup()
  const press = (point: Point) => user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: toClient(point) })
  return {
    user,
    hover: async (point: Point) => {
      await user.pointer({ target: drawCanvas, coords: toClient(point) })
      await wait()
    },
    click: async (point: Point) => {
      await press(point)
      await wait(100)
    },
    doubleClick: async (point: Point) => {
      await wait(DOUBLE_CLICK_DELAY)
      await press(point)
      await wait()
      await press(point)
      await wait(100)
    },
    drag: async (from: Point, to: Point) => {
      await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: toClient(from) })
      await wait()
      await user.pointer({ target: drawCanvas, coords: toClient([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]) })
      await user.pointer({ target: drawCanvas, coords: toClient(to) })
      await wait()
      await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: toClient(to) })
      await wait(100)
    }
  }
}

/**
 * Selection in the groups: a click selects the group of the drawing, a double click opens a group, Escape goes up a level.
 * Shift+click adds shapes of several levels, Ctrl+G groups them, Alt+drag copies a shape of a group in its group, and a
 * locked group is selected as a whole
 */
export const Groups: Story = {
  args: {
    // outer holds inner and c, inner holds a and a text. free is alone, l1 and l2 are locked with their group
    shapes: [
      {
        type: 'group',
        id: 'outer',
        shapes: [
          {
            type: 'group',
            id: 'inner',
            shapes: [
              square('a', 100, 100),
              { type: 'text', id: 'text', x: 250, y: 120, value: ['Hello'], fontSize: 40, style: { strokeColor: 'black' } }
            ]
          },
          square('c', 400, 100)
        ]
      },
      square('free', 650, 100),
      { type: 'group', id: 'locked', locked: true, shapes: [square('l1', 100, 350), square('l2', 250, 350)] }
    ]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { user, hover, click, doubleClick, drag } = createGestures(drawCanvas)

    // =====================================================================
    // A click selects the group of the drawing holding the shape under the cursor, the one which is hovered
    // =====================================================================

    await hover(A)
    expect(getHoveredId()).toBe('outer')
    await click(A)
    expect(getSelectedIds()).toEqual(['outer'])

    // a drag moves the group with all its shapes
    await drag(A, [170, 160])
    expect([getPosition('a'), getPosition('text'), getPosition('c')]).toEqual([
      [120, 110],
      [270, 130],
      [420, 110]
    ])
    expect(getSelectedIds()).toEqual(['outer'])
    getPaint().actions.undo()
    expect(getPosition('a')).toEqual([100, 100])

    // =====================================================================
    // A double click opens a group: its shape under the cursor is selected. The shapes of an opened group are hovered
    // and selected by a click, and a double click on a text edits it
    // =====================================================================

    await doubleClick(A)
    expect(getSelectedIds()).toEqual(['inner'])
    await hover(C)
    expect(getHoveredId()).toBe('c')
    await doubleClick(TEXT)
    expect(getSelectedIds()).toEqual(['text'])
    await doubleClick(TEXT)
    expect(await view.findByRole('textbox')).toBeInTheDocument()
    expect(getState().interaction.mode).toBe('textedition')

    // =====================================================================
    // Escape goes up a level: from the text being edited to its group, then to the group holding it, then out of the groups
    // =====================================================================

    await user.keyboard('{Escape}')
    expect(getSelectedIds()).toEqual(['inner'])
    expect(getState().interaction.mode).toBe('default')
    expect(view.queryByRole('textbox')).toBeNull()
    await user.keyboard('{Escape}')
    expect(getSelectedIds()).toEqual(['outer'])
    await user.keyboard('{Escape}')
    expect(getSelectedIds()).toEqual([])

    // =====================================================================
    // Alt+drag copies a shape of a group in its group, in front of it, where it was
    // =====================================================================

    await doubleClick(C)
    expect(getSelectedIds()).toEqual(['c'])
    await user.keyboard('{Alt>}')
    await drag(C, [450, 250])
    await user.keyboard('{/Alt}')
    const [, copyId] = getChildIds('outer')
    expect(getChildIds('outer')).toEqual(['inner', copyId, 'c'])
    expect(copyId).not.toBe('c')
    expect(getPosition(copyId!)).toEqual([400, 100])
    expect(getPosition('c')).toEqual([400, 200])
    expect(getSelectedIds()).toEqual(['c'])
    getPaint().actions.undo()
    expect(getChildIds('outer')).toEqual(['inner', 'c'])

    // =====================================================================
    // Shift+click adds shapes of several levels, which Ctrl+G groups and Ctrl+Shift+G ungroups
    // =====================================================================

    getPaint().actions.selectShapes(['c'])
    await user.keyboard('{Shift>}')
    await click(A)
    await click(FREE)
    await user.keyboard('{/Shift}')
    expect(getSelectedIds()).toEqual(['c', 'inner', 'free'])

    // the group takes the place of outer, whose shapes are all grouped
    await user.keyboard('{Control>}g{/Control}')
    const [groupId] = getRootIds()
    expect(getRootIds()).toEqual([groupId, 'locked'])
    expect(getChildIds(groupId!)).toEqual(['inner', 'c', 'free'])
    expect(getSelectedIds()).toEqual([groupId])
    await user.keyboard('{Control>}{Shift>}G{/Shift}{/Control}')
    expect(getRootIds()).toEqual(['inner', 'c', 'free', 'locked'])
    expect(getSelectedIds()).toEqual(['inner', 'c', 'free'])
    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}z{/Control}')
    expect(getRootIds()).toEqual(['outer', 'free', 'locked'])
    expect(getChildIds('outer')).toEqual(['inner', 'c'])

    // =====================================================================
    // A locked group is neither hovered nor moved, nor opened: it is selected as a whole
    // =====================================================================

    getPaint().actions.clearSelection()
    await hover(L1)
    expect(getHoveredId()).toBeUndefined()
    await click(L1)
    expect(getSelectedIds()).toEqual(['locked'])
    await drag(L1, [200, 450])
    expect(getPosition('l1')).toEqual([100, 350])
    await doubleClick(L1)
    expect(getSelectedIds()).toEqual(['locked'])
  }
}

/** A group turned keeps its frame turned when it is resized: the line in it is stretched along the side of its frame */
export const GroupTransforms: Story = {
  args: {
    shapes: [
      {
        type: 'group',
        id: 'pair',
        shapes: [
          square('square', 200, 200),
          {
            type: 'line',
            id: 'line',
            points: [
              [350, 250],
              [450, 250]
            ],
            style: { strokeColor: '#e74c3c', lineWidth: 3 }
          }
        ]
      }
    ]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { click, drag } = createGestures(drawCanvas)

    // turned by a quarter around its center (325, 250), clockwise: the square goes above it, the line below it
    getPaint().actions.rotateShapes(['pair'], Math.PI / 2)
    await wait(100)
    await click([325, 175])
    expect(getSelectedIds()).toEqual(['pair'])

    // the anchor of the right side of the frame, turned to the bottom, is dragged down
    const { computed, rotation = 0 } = getState().selection!
    const { borders, center } = computed
    const [dx, dy] = [borders.x + borders.width - center[0], borders.y + borders.height / 2 - center[1]]
    const anchor: Point = [
      center[0] + dx * Math.cos(rotation) - dy * Math.sin(rotation),
      center[1] + dx * Math.sin(rotation) + dy * Math.cos(rotation)
    ]
    expect(anchor[0]).toBeCloseTo(325, 0)
    await drag(anchor, [anchor[0], anchor[1] + 100])

    expect(getPaint().getShape('pair')?.rotation).toBeCloseTo(Math.PI / 2)
    expect(getPaint().getShape('square')?.rotation).toBeCloseTo(Math.PI / 2)
    const { points } = getPaint().getShape('line') as ShapeEntity<'line'>
    expect(points[0]![0]).toBeCloseTo(325, 0)
    expect(points[1]![0]).toBeCloseTo(325, 0)
    expect(points[1]![1] - points[0]![1]).toBeGreaterThan(130)
  }
}

/**
 * The settings bar of a selected group: its fields are the ones of the shapes of the group. A color goes to these shapes,
 * the opacity to the group itself, and the font size to the texts of the group
 */
export const GroupSettings: Story = {
  args: {
    shapes: [
      {
        type: 'group',
        id: 'texts',
        shapes: [
          { type: 'text', id: 'one', x: 100, y: 100, value: ['One'], fontSize: 30, style: { strokeColor: 'black' } },
          { type: 'text', id: 'two', x: 100, y: 200, value: ['Two'], fontSize: 30, style: { strokeColor: 'black' } }
        ]
      },
      { type: 'group', id: 'pair', shapes: [square('a', 400, 100), square('b', 550, 100)] }
    ]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    const getText = (id: string) => getPaint().getShape(id) as ShapeEntity<'text'>

    getPaint().actions.selectShapes(['texts'])
    await wait(100)
    await setNumberSetting(view, 'Taille du texte', 50)
    expect([getText('one').fontSize, getText('two').fontSize]).toEqual([50, 50])

    getPaint().actions.selectShapes(['pair'])
    await wait(100)
    // a group of rects has no font size
    expect(view.queryByRole('button', { name: 'Taille du texte' })).toBeNull()
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setRangeSetting(view, 'Opacité', 40)
    expect(getPaint().getShape('pair')?.style).toEqual({ opacity: 40 })
    expect(getPaint().getShape('a')?.style).toMatchObject({ strokeColor: 'red', opacity: 100 })
    expect(getPaint().getShape('b')?.style).toMatchObject({ strokeColor: 'red', opacity: 100 })
    // the bar shows the opacity of the group, not the one of its shapes
    await userEvent.click(view.getByRole('button', { name: 'Opacité' }))
    expect(view.getByRole('slider')).toHaveValue('40')
    await userEvent.click(view.getByRole('button', { name: 'Opacité' }))
  }
}
