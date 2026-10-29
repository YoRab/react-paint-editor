import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape, ShapeEntity } from '../../../src/index'
import {
  assertNoInternalFields,
  getChildIds,
  getCurrentDataRef,
  getPaint,
  getRootIds,
  getState,
  makeCoordConverters,
  ReactPaintWrapper,
  selectTool,
  square,
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

// Blue rectangle, left side of canvas. Fill required so that clicks inside select it.
const INITIAL_RECT_LAYER: DrawableShape = {
  type: 'rect',
  x: 150,
  y: 200,
  width: 200,
  height: 150,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: 'blue',
    opacity: 100,
    lineWidth: 2
  }
}

// Yellow circle, right side of canvas. x/y is the center.
const INITIAL_CIRCLE_LAYER: DrawableShape = {
  type: 'circle',
  x: 700,
  y: 300,
  radius: 80,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: 'yellow',
    opacity: 100,
    lineWidth: 2
  }
}

/**
 * Simulates the HTML5 drag-and-drop of the layers. Passing a plain object as dataTransfer in the DragEvent constructor
 * fails browser validation: each DragEvent is created without dataTransfer, which is then shadowed on the instance.
 * dispatchDrag returns false when the default of the event is prevented, as a layer accepting the drop does on dragover
 */
const createDragEvents = () => {
  const dt = {
    data: {} as Record<string, string>,
    effectAllowed: 'move' as string,
    setData(type: string, val: string) {
      this.data[type] = val
    },
    getData(type: string) {
      return this.data[type] ?? ''
    }
  }
  return (type: string, target: HTMLElement, withDt = true) => {
    const event = new DragEvent(type, { bubbles: true, cancelable: true })
    if (withDt) Object.defineProperty(event, 'dataTransfer', { value: dt, configurable: true })
    return target.dispatchEvent(event)
  }
}

export const Layers: Story = {
  args: {
    // shapes[0] = rect (drawn first = below), shapes[1] = circle (drawn last = on top)
    shapes: [INITIAL_RECT_LAYER, INITIAL_CIRCLE_LAYER]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const { toClientX, toClientY } = makeCoordConverters(rect)
    const user = userEvent.setup()

    // =====================================================================
    // Step 1: Open the layers panel
    // =====================================================================
    await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Step 2: Swap layers — drag rect (index 0) onto circle (index 1)
    // moveItemPosition(shapes, 0, 1) → [circle, rect]
    // =====================================================================
    const layerItems = canvasElement.querySelectorAll('.react-paint-editor-layout')
    const rectLayerItem = layerItems[0] as HTMLElement
    const circleLayerItem = layerItems[1] as HTMLElement

    const dispatchDrag = createDragEvents()
    dispatchDrag('dragstart', rectLayerItem)
    await new Promise(res => setTimeout(res, 50))
    dispatchDrag('dragover', circleLayerItem)
    dispatchDrag('drop', circleLayerItem)
    dispatchDrag('dragend', rectLayerItem, false)
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Assert order changed: shapes[0]=circle, shapes[1]=rect
    // =====================================================================
    expect(getCurrentDataRef.current).not.toBeNull()
    let data = getCurrentDataRef.current!()
    expect(data.shapes).toHaveLength(2)
    expect((data.shapes![0] as { type: string }).type).toBe('circle')
    expect((data.shapes![1] as { type: string }).type).toBe('rect')

    // =====================================================================
    // Step 3: Toggle circle visibility (hide) and lock the rect
    // Layer items have been re-rendered in new order: [0]=circle, [1]=rect.
    // shape.visible is undefined by default → title='Show'; clicking sets visible=false.
    // shape.locked is undefined by default → title='Unlocked'; clicking sets locked=true.
    // =====================================================================
    const updatedLayerItems = canvasElement.querySelectorAll('.react-paint-editor-layout')
    const circleLayerItemUpdated = updatedLayerItems[0] as HTMLElement
    const rectLayerItemUpdated = updatedLayerItems[1] as HTMLElement

    const circleVisibilityBtn = circleLayerItemUpdated.querySelector('.react-paint-editor-layouts-visible-button') as HTMLElement
    await userEvent.click(circleVisibilityBtn)
    await new Promise(res => setTimeout(res, 100))

    const rectLockBtn = rectLayerItemUpdated.querySelector('.react-paint-editor-layouts-locked-button') as HTMLElement
    await userEvent.click(rectLockBtn)
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Assert visibility and lock state
    // =====================================================================
    data = getCurrentDataRef.current!()
    const circleShape = data.shapes![0] as { type: string; visible?: boolean; x: number; y: number }
    const rectShape = data.shapes![1] as { type: string; locked?: boolean; x: number; y: number }
    assertNoInternalFields(data.shapes![0])
    assertNoInternalFields(data.shapes![1])
    expect(circleShape.type).toBe('circle')
    expect(circleShape.visible).toBe(false)
    expect(rectShape.type).toBe('rect')
    expect(rectShape.locked).toBe(true)

    // =====================================================================
    // Step 4: Try to select and move the circle (hidden but not locked → succeeds)
    // Circle center at canvas (700, 300). Drag 50px left to (650, 300).
    // Hidden shapes are excluded from rendering but NOT from hit-testing.
    // =====================================================================
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(650), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(650), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Step 5: Try to select and move the rect (visible but locked → fails)
    // Locked shapes are excluded from hover detection — clicking has no effect.
    // Rect center at canvas (250, 275). Attempted drag 50px right to (300, 275).
    // =====================================================================
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(250), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(250), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(300), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(300), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Final assertions: circle moved, rect did not
    // =====================================================================
    data = getCurrentDataRef.current!()
    const finalCircle = data.shapes![0] as { type: string; x: number; y: number }
    const finalRect = data.shapes![1] as { type: string; x: number; y: number }

    expect(finalCircle.type).toBe('circle')
    expect(finalCircle.x).toBeCloseTo(650, 0) // moved 50px left
    expect(finalCircle.y).toBeCloseTo(300, 0)

    expect(finalRect.type).toBe('rect')
    expect(finalRect.x).toBeCloseTo(150, 0) // unchanged (locked)
    expect(finalRect.y).toBeCloseTo(200, 0)
  }
}

export const LayersPanelActions: Story = {
  args: {
    shapes: [
      { type: 'square', x: 150, y: 200, width: 100, height: 100, style: { fillColor: '#4a90d9' } },
      { type: 'square', x: 650, y: 200, width: 100, height: 100, style: { fillColor: '#e74c3c' } }
    ]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
    await new Promise(res => setTimeout(res, 100))

    const getLayers = () => [...canvasElement.querySelectorAll<HTMLElement>('.react-paint-editor-layout')]
    // the layers show the ids of the shapes, from the foreground
    const [frontId, backId] = getPaint()
      .getState()
      .shapes.map(shape => shape.id) as [string, string]
    expect(getLayers().map(layer => layer.textContent)).toEqual([frontId, backId])

    // --- A click on a layer selects its shape ---
    await userEvent.click(getLayers()[1]!)
    await new Promise(res => setTimeout(res, 50))
    expect(getPaint().getState().selectedShapeIds).toEqual([backId])

    // --- The remove button of a layer removes its shape only ---
    await userEvent.click(within(getLayers()[0]!).getByRole('button', { name: 'Remove' }))
    await new Promise(res => setTimeout(res, 50))
    expect(
      getPaint()
        .getState()
        .shapes.map(shape => shape.id)
    ).toEqual([backId])
    expect(getPaint().getState().selectedShapeIds).toEqual([backId])

    // --- The grid can be removed again ---
    await userEvent.click(view.getByRole('button', { name: 'L' }))
    expect(getPaint().getState().gridGap).toBe(40)
    await userEvent.click(view.getByRole('button', { name: 'No grid' }))
    expect(getPaint().getState().gridGap).toBe(0)
  }
}

const getSelectedIds = () => [...getState().selectedShapeIds].sort()

/**
 * The layers of the groups: a group is followed by its shapes, indented below it, and can be collapsed and renamed. The
 * layers are selected together with Shift or Ctrl, grouped and ungrouped by the buttons above them, and a shape is only
 * dropped among the shapes of its group
 */
export const LayersOfGroups: Story = {
  args: {
    // outer holds a and inner, inner holds b and c, d is alone
    shapes: [
      {
        type: 'group',
        id: 'outer',
        name: 'Outer',
        shapes: [square('a', 100, 100), { type: 'group', id: 'inner', shapes: [square('b', 250, 100), square('c', 400, 100)] }]
      },
      square('d', 650, 100)
    ]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    await user.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
    await wait(100)

    const getLayers = () => [...canvasElement.querySelectorAll<HTMLElement>('.react-paint-editor-layout')]
    const getLabels = () => getLayers().map(layer => layer.textContent)
    const getLayer = (label: string) => getLayers().find(layer => layer.textContent === label)!

    // =====================================================================
    // A group is followed by its shapes, indented below it. It shows its name, or else its id
    // =====================================================================

    expect(getLabels()).toEqual(['Outer', 'a', 'inner', 'b', 'c', 'd'])
    expect(getLayers().map(layer => layer.style.getPropertyValue('--react-paint-editor-layout-depth'))).toEqual(['0', '1', '1', '2', '2', '0'])

    // a collapsed group hides its shapes, at any depth
    await user.click(within(getLayer('inner')).getByRole('button', { name: 'Collapse' }))
    expect(getLabels()).toEqual(['Outer', 'a', 'inner', 'd'])
    await user.click(within(getLayer('Outer')).getByRole('button', { name: 'Collapse' }))
    expect(getLabels()).toEqual(['Outer', 'd'])
    expect(getSelectedIds()).toEqual([])

    // the groups holding a shape selected are expanded again, to show it
    getPaint().actions.selectShapes(['b'])
    await wait()
    expect(getLabels()).toEqual(['Outer', 'a', 'inner', 'b', 'c', 'd'])
    expect(getLayer('b').dataset.selected).toBe('1')

    // =====================================================================
    // Shift+click adds a shape to the selection, Ctrl+click removes a selected one
    // =====================================================================

    await user.click(getLayer('d'))
    await user.keyboard('{Shift>}')
    await user.click(getLayer('a'))
    await user.keyboard('{/Shift}')
    expect(getSelectedIds()).toEqual(['a', 'd'])
    await user.keyboard('{Control>}')
    await user.click(getLayer('d'))
    await user.keyboard('{/Control}')
    expect(getSelectedIds()).toEqual(['a'])

    // =====================================================================
    // The buttons above the layers group and ungroup the selected shapes
    // =====================================================================

    const groupButton = view.getByRole('button', { name: 'Group shapes' })
    const ungroupButton = view.getByRole('button', { name: 'Ungroup shapes' })
    expect(groupButton).toBeDisabled()
    expect(ungroupButton).toBeDisabled()
    // b and c are all the shapes of inner: grouping them would give inner again
    getPaint().actions.selectShapes(['b', 'c'])
    await wait()
    expect(groupButton).toBeDisabled()

    getPaint().actions.selectShapes(['outer', 'd'])
    await wait()
    expect(groupButton).toBeEnabled()
    expect(ungroupButton).toBeEnabled()
    await user.click(groupButton)
    const [groupId] = getRootIds()
    expect(getRootIds()).toEqual([groupId])
    expect(getChildIds(groupId!)).toEqual(['outer', 'd'])
    expect(getSelectedIds()).toEqual([groupId])
    expect(getLabels()).toEqual([groupId, 'Outer', 'a', 'inner', 'b', 'c', 'd'])

    await user.click(ungroupButton)
    expect(getRootIds()).toEqual(['outer', 'd'])
    expect(getSelectedIds()).toEqual(['d', 'outer'])

    // =====================================================================
    // A double click on a group renames it: Enter keeps the name typed, Escape cancels, an empty name shows the id again
    // =====================================================================

    const getNameField = () => view.queryByRole('textbox', { name: 'Group name' })
    const getName = () => (getPaint().getShape('outer') as ShapeEntity<'group'>).name

    await user.dblClick(getLayer('Outer'))
    expect(getNameField()).toHaveValue('Outer')
    await user.clear(getNameField()!)
    await user.type(getNameField()!, 'Front{Enter}')
    expect(getName()).toBe('Front')
    expect(getNameField()).toBeNull()
    expect(getLabels()[0]).toBe('Front')
    // the layer keeps the focus, for the shortcuts
    expect(document.activeElement).toBe(getLayer('Front'))
    expect(getState().interaction.focus.component).toBe(true)

    await user.dblClick(getLayer('Front'))
    await user.type(getNameField()!, ' and back{Escape}')
    expect(getName()).toBe('Front')
    expect(getNameField()).toBeNull()

    await user.dblClick(getLayer('Front'))
    await user.clear(getNameField()!)
    await user.keyboard('{Enter}')
    expect(getPaint().getShape('outer')).not.toHaveProperty('name')
    expect(getLabels()[0]).toBe('outer')

    // a double click on a button of the layer does not rename it
    await user.dblClick(within(getLayer('inner')).getByRole('button', { name: 'Collapse' }))
    expect(getNameField()).toBeNull()
    expect(getLabels()).toEqual(['outer', 'a', 'inner', 'b', 'c', 'd'])

    // =====================================================================
    // A shape is dropped among the shapes of its group only
    // =====================================================================

    const dispatchDrag = createDragEvents()
    dispatchDrag('dragstart', getLayer('a'))
    await wait()
    // the move over a layer of another group is not accepted, the drop on it does nothing
    expect(dispatchDrag('dragover', getLayer('d'))).toBe(true)
    dispatchDrag('drop', getLayer('d'))
    dispatchDrag('dragend', getLayer('a'), false)
    await wait(100)
    expect(getRootIds()).toEqual(['outer', 'd'])
    expect(getChildIds('outer')).toEqual(['a', 'inner'])

    dispatchDrag('dragstart', getLayer('a'))
    await wait()
    expect(dispatchDrag('dragover', getLayer('inner'))).toBe(false)
    dispatchDrag('drop', getLayer('inner'))
    dispatchDrag('dragend', getLayer('a'), false)
    await wait(100)
    expect(getChildIds('outer')).toEqual(['inner', 'a'])

    // =====================================================================
    // The eye and the lock of a group change its own flags: a selected shape of a group locked is replaced by the group
    // =====================================================================

    getPaint().actions.selectShapes(['b'])
    await wait()
    await user.click(getLayer('inner').querySelector<HTMLElement>('.react-paint-editor-layouts-visible-button')!)
    expect(getPaint().getShape('inner')?.visible).toBe(false)
    expect(getPaint().getShape('b')?.visible).toBeUndefined()
    await user.click(getLayer('outer').querySelector<HTMLElement>('.react-paint-editor-layouts-locked-button')!)
    expect(getPaint().getShape('outer')?.locked).toBe(true)
    expect(getSelectedIds()).toEqual(['outer'])
  }
}
