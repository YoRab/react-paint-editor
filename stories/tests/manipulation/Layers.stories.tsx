import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape, ShapeEntity } from '../../../src/index'
import {
  assertNoInternalFields,
  dispatchPointer,
  dispatchTouch,
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

type PagePoint = { x: number; y: number }

/** Point of an element in the page, from its left and its top, in fractions of its size */
const pointOf = (element: Element, ratioX = 0.5, ratioY = 0.5): PagePoint => {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width * ratioX, y: rect.top + rect.height * ratioY }
}

/**
 * Presses an element of a layer and moves the pointer through the positions, beyond the threshold of the drag. The events
 * go to the element pressed, like with a capture of the pointer. Returns the release
 */
const pressAndMove = (pressed: Element, pointerType: 'mouse' | 'touch', ...positions: PagePoint[]) => {
  const start = pointOf(pressed)
  dispatchPointer(pressed, 'pointerdown', pointerType, 1, start)
  for (const position of positions) dispatchPointer(pressed, 'pointermove', pointerType, 1, position)
  return () => dispatchPointer(pressed, 'pointerup', pointerType, 1, positions.at(-1) ?? start)
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
    // Step 2: Reorder layers — drag the row of rect (index 0) with the mouse, below circle (index 1)
    // → [circle, rect]
    // =====================================================================
    const layerItems = canvasElement.querySelectorAll('.react-paint-editor-layout')
    const rectLayerItem = layerItems[0] as HTMLElement
    const circleLayerItem = layerItems[1] as HTMLElement

    const release = pressAndMove(rectLayerItem, 'mouse', pointOf(circleLayerItem, 0.5, 0.9))
    // the line shows the layer going after circle, the layer dragged is selected
    expect(circleLayerItem.dataset.drop).toBe('after')
    expect(rectLayerItem.dataset.isDragging).toBe('1')
    release()
    const [rectId] = getPaint().getState().selectedShapeIds
    expect(rectLayerItem.dataset.isDragging).toBeUndefined()
    expect(circleLayerItem.dataset.drop).toBeUndefined()
    // the click of the release does not select the layer again: Shift would remove it from the selection
    rectLayerItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }))
    expect(getPaint().getState().selectedShapeIds).toEqual([rectId])
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
    // shape.visible is undefined by default → title='Hide'; clicking sets visible=false.
    // shape.locked is undefined by default → title='Lock'; clicking sets locked=true.
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
    // the layers show the default names of the shapes, from the foreground, numbered from the background
    const [, backId] = getPaint()
      .getState()
      .shapes.map(shape => shape.id) as [string, string]
    expect(getLayers().map(layer => layer.textContent)).toEqual(['Square 2', 'Square 1'])

    // --- A click on a layer selects its shape ---
    await userEvent.click(getLayers()[1]!)
    await new Promise(res => setTimeout(res, 50))
    expect(getPaint().getState().selectedShapeIds).toEqual([backId])

    // --- The remove button of a layer removes its shape only ---
    await userEvent.click(within(getLayers()[0]!).getByRole('button', { name: 'Delete' }))
    await new Promise(res => setTimeout(res, 50))
    expect(
      getPaint()
        .getState()
        .shapes.map(shape => shape.id)
    ).toEqual([backId])
    expect(getPaint().getState().selectedShapeIds).toEqual([backId])

    // --- The grid can be removed again ---
    await userEvent.click(view.getByRole('button', { name: 'L, Large grid' }))
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
    const getLayer = (id: string) => getLayers().find(layer => layer.dataset.layerId === id)!
    const getLayerButton = (id: string) => within(getLayer(id)).getByRole('button', { pressed: getLayer(id).dataset.selected === '1' })

    // =====================================================================
    // A group is followed by its shapes, indented below it. A layer shows the name of its shape, or else its type
    // numbered from the background
    // =====================================================================

    expect(getLabels()).toEqual(['Outer', 'Rectangle 4', 'Group 1', 'Rectangle 3', 'Rectangle 2', 'Rectangle 1'])
    expect(getLayers().map(layer => layer.style.getPropertyValue('--react-paint-editor-layout-depth'))).toEqual(['0', '1', '1', '2', '2', '0'])

    // a collapsed group hides its shapes, at any depth
    await user.click(within(getLayer('inner')).getByRole('button', { name: 'Collapse' }))
    expect(getLabels()).toEqual(['Outer', 'Rectangle 4', 'Group 1', 'Rectangle 1'])
    await user.click(within(getLayer('outer')).getByRole('button', { name: 'Collapse' }))
    expect(getLabels()).toEqual(['Outer', 'Rectangle 1'])
    expect(getSelectedIds()).toEqual([])

    // the groups holding a shape selected are expanded again, to show it
    getPaint().actions.selectShapes(['b'])
    await wait()
    expect(getLabels()).toEqual(['Outer', 'Rectangle 4', 'Group 1', 'Rectangle 3', 'Rectangle 2', 'Rectangle 1'])
    expect(getLayer('b').dataset.selected).toBe('1')
    expect(getLayerButton('b')).toHaveAccessibleName('Rectangle 3')

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
    expect(getLabels()).toEqual(['Group 2', 'Outer', 'Rectangle 4', 'Group 1', 'Rectangle 3', 'Rectangle 2', 'Rectangle 1'])

    await user.click(ungroupButton)
    expect(getRootIds()).toEqual(['outer', 'd'])
    expect(getSelectedIds()).toEqual(['d', 'outer'])

    // =====================================================================
    // A double click on a layer renames its shape: Enter keeps the name typed, Escape cancels, an empty name shows the
    // default name again
    // =====================================================================

    const getNameField = () => view.queryByRole('textbox', { name: 'Layer name' })
    const getName = () => (getPaint().getShape('outer') as ShapeEntity<'group'>).name

    await user.dblClick(getLayer('outer'))
    expect(getNameField()).toHaveValue('Outer')
    await user.clear(getNameField()!)
    await user.type(getNameField()!, 'Front{Enter}')
    expect(getName()).toBe('Front')
    expect(getNameField()).toBeNull()
    expect(getLabels()[0]).toBe('Front')
    // the layer keeps the focus, for the shortcuts
    await wait()
    expect(document.activeElement).toBe(getLayerButton('outer'))
    expect(getState().interaction.focus.component).toBe(true)

    await user.dblClick(getLayer('outer'))
    await user.type(getNameField()!, ' and back{Escape}')
    expect(getName()).toBe('Front')
    expect(getNameField()).toBeNull()

    await user.dblClick(getLayer('outer'))
    await user.clear(getNameField()!)
    await user.keyboard('{Enter}')
    expect(getPaint().getShape('outer')).not.toHaveProperty('name')
    expect(getLabels()[0]).toBe('Group 2')

    // a double click on a button of the layer does not rename it
    await user.dblClick(within(getLayer('inner')).getByRole('button', { name: 'Collapse' }))
    expect(getNameField()).toBeNull()
    expect(getLabels()).toEqual(['Group 2', 'Rectangle 4', 'Group 1', 'Rectangle 3', 'Rectangle 2', 'Rectangle 1'])

    // =====================================================================
    // A layer is dragged by its handle, with a finger too, and dropped among the shapes of its group only: a line shows
    // where it goes
    // =====================================================================

    const getHandle = (id: string) => getLayer(id).querySelector<HTMLElement>('.react-paint-editor-layout-handle')!
    const getDropLines = () => getLayers().flatMap(layer => (layer.dataset.drop ? [[layer.dataset.layerId, layer.dataset.drop]] : []))

    // a finger on the row, outside of its handle, scrolls the list instead
    let release = pressAndMove(getLayer('a').querySelector('.react-paint-editor-layout-select')!, 'touch', pointOf(getLayer('c'), 0.5, 0.9))
    expect(getLayer('a').dataset.isDragging).toBeUndefined()
    expect(getDropLines()).toEqual([])
    release()

    // the line goes after inner and its shapes, a single block of the group of a
    release = pressAndMove(getHandle('a'), 'touch', pointOf(getLayer('c'), 0.5, 0.9))
    expect(getLayer('a').dataset.isDragging).toBe('1')
    expect(getDropLines()).toEqual([['c', 'after']])
    // over a layer out of the group of a, the line is hidden and the layer is not dropped
    dispatchTouch(getHandle('a'), 'pointermove', 1, pointOf(getLayer('d'), 0.5, 0.9))
    expect(getDropLines()).toEqual([])
    release()
    await wait()
    expect(getRootIds()).toEqual(['outer', 'd'])
    expect(getChildIds('outer')).toEqual(['a', 'inner'])
    expect(getLayer('a').dataset.isDragging).toBeUndefined()

    release = pressAndMove(getHandle('a'), 'touch', pointOf(getLayer('c'), 0.5, 0.9))
    release()
    await wait()
    expect(getChildIds('outer')).toEqual(['inner', 'a'])
    expect(getSelectedIds()).toEqual(['a'])

    // with the mouse, the whole row is dragged: Escape cancels the drag, the panel staying open
    release = pressAndMove(getLayer('d'), 'mouse', pointOf(getLayer('outer'), 0.5, 0.1))
    expect(getDropLines()).toEqual([['outer', 'before']])
    await user.keyboard('{Escape}')
    expect(getDropLines()).toEqual([])
    expect(getLayer('d').dataset.isDragging).toBeUndefined()
    release()
    await wait()
    expect(getRootIds()).toEqual(['outer', 'd'])
    expect(getSelectedIds()).toEqual(['d'])
    expect(view.getByRole('list', { name: 'Layers' })).toBeInTheDocument()

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
