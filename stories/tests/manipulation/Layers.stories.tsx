import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  makeCoordConverters,
  selectTool,
  assertNoInternalFields
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

    // Simulate HTML5 drag-and-drop.
    // Passing a plain object as dataTransfer in the DragEvent constructor fails browser
    // validation. Instead, create each DragEvent without dataTransfer, then shadow the
    // (prototype getter) property with Object.defineProperty on the instance.
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
    const dispatchDrag = (type: string, target: HTMLElement, withDt = true) => {
      const event = new DragEvent(type, { bubbles: true, cancelable: true })
      if (withDt) Object.defineProperty(event, 'dataTransfer', { value: dt, configurable: true })
      target.dispatchEvent(event)
    }
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
