import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Canvas, type ShapeEntity, type UseReactPaintProps, useReactPaint } from '../../../src/index'
import { getPaint, getPixel, makeCoordConverters, paintRef, wait } from './../helpers'

const SHAPE_EVENTS = ['shapeClicked', 'shapeHovered', 'canvasClicked', 'canvasDoubleClicked'] as const

/** Ids of the shapes given to the pointer events, by the last rendered harness */
const shapeEvents: { name: (typeof SHAPE_EVENTS)[number]; id: string | undefined }[] = []

/** Ids of the shapes given to one of the pointer events */
const idsOf = (name: (typeof SHAPE_EVENTS)[number]) => shapeEvents.filter(event => event.name === name).map(event => event.id)

/** Canvas alone, without Editor, listening to the shape events. withCanvas false keeps the Canvas unmounted */
const ApiHarness = ({
  withCanvas = true,
  containerWidth = 1000,
  ...props
}: UseReactPaintProps & { withCanvas?: boolean; containerWidth?: number }) => {
  const paint = useReactPaint(props)
  paintRef.current = paint

  useEffect(() => {
    shapeEvents.length = 0
    const unregisters = SHAPE_EVENTS.map(name =>
      paint.registerEvent(name, (shape: ShapeEntity | undefined) => shapeEvents.push({ name, id: shape?.id }))
    )
    return () => {
      for (const unregister of unregisters) unregister()
    }
  }, [paint])

  return withCanvas ? (
    <div ref={paint.scopeRef} style={{ width: containerWidth }}>
      <Canvas paint={paint} />
    </div>
  ) : (
    <output>no canvas</output>
  )
}

/** Color of the top left pixel of an exported image */
const getFirstPixel = async (dataUrl: string) => {
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return Array.from(ctx.getImageData(1, 1, 1, 1).data)
}

const meta = {
  title: 'Tests/Manipulation/API',
  component: ApiHarness,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ApiHarness>

export default meta
type Story = StoryObj<typeof meta>

/** In viewer mode the shapes created by the API can be clicked and hovered, and found under a point */
export const ShapeEventsInViewer: Story = {
  args: { mode: 'viewer' },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const paint = getPaint()
    const user = userEvent.setup()

    const [rect] = paint.actions.addShapes([{ type: 'rect', x: 100, y: 100, width: 200, height: 100, style: { fillColor: 'red' } }])
    expect(paint.getShapesAt([150, 150]).map(shape => shape.id)).toEqual([rect])
    expect(paint.getShapesAt([500, 500])).toEqual([])

    // hovering the shape, then the empty canvas
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(150), y: toClientY(150) } })
    await waitFor(() => expect(idsOf('shapeHovered')).toContain(rect))
    expect(drawCanvas.style.cursor).toBe('pointer')
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(500), y: toClientY(500) } })
    await waitFor(() => expect(shapeEvents[shapeEvents.length - 1]).toEqual({ name: 'shapeHovered', id: undefined }))
    expect(drawCanvas.style.cursor).toBe('')

    // a click on the shape, and on the empty canvas
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(150), y: toClientY(150) } })
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(500), y: toClientY(500) } })
    expect(idsOf('shapeClicked')).toEqual([rect])
    // canvasClicked gives both, far from each other: they are not a double click
    expect(idsOf('canvasClicked')).toEqual([rect, undefined])
    expect(idsOf('canvasDoubleClicked')).toEqual([])

    // two clicks at the same place, on the shape and on the empty canvas
    await user.pointer([
      { target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(150), y: toClientY(150) } },
      { target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(150), y: toClientY(150) } }
    ])
    await user.pointer([
      { target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(500), y: toClientY(500) } },
      { target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(500), y: toClientY(500) } }
    ])
    expect(idsOf('canvasDoubleClicked')).toEqual([rect, undefined])
    // the double click comes after the second click
    expect(shapeEvents.slice(-2)).toEqual([
      { name: 'canvasClicked', id: undefined },
      { name: 'canvasDoubleClicked', id: undefined }
    ])
  }
}

/** Actions which need the mounted Canvas: edition of a text, context menu, zoom, export with a background */
export const ActionsWithCanvas: Story = {
  args: { options: { size: 'infinite' } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    const paint = getPaint()

    const [text] = paint.actions.addShapes([{ type: 'text', x: 100, y: 100, value: ['Hello'], fontSize: 30 }])
    const textShape = paint.getShape(text!)
    expect(textShape?.type === 'text' && textShape.width).toBeGreaterThan(30)

    paint.actions.editText(text!)
    await waitFor(() => expect(canvasElement.querySelector('.react-paint-canvas-edittextbox')).not.toBeNull())
    paint.actions.clearSelection()

    paint.actions.openContextMenu({ clientPosition: { x: 10, y: 10 }, ids: [text!] })
    expect(paint.getState().contextMenu?.shapes.map(shape => shape.id)).toEqual([text])
    paint.actions.closeContextMenu()

    paint.actions.zoomTo(2, { center: [150, 120] })
    const { zoom, offset } = paint.getState().view
    expect(zoom).toBe(2)
    expect((150 + offset[0]) * zoom).toBeCloseTo(150)
    paint.actions.resetZoom()

    const jpeg = paint.getCurrentImage({ format: 'jpeg', quality: 0.9, backgroundColor: 'rgb(255, 0, 0)' })
    expect(jpeg.startsWith('data:image/jpeg')).toBe(true)
    const [red, green] = await getFirstPixel(jpeg)
    expect(red).toBeGreaterThan(200)
    expect(green).toBeLessThan(60)

    const background = document.createElement('canvas')
    background.width = 10
    background.height = 10
    const backgroundCtx = background.getContext('2d')!
    backgroundCtx.fillStyle = 'rgb(0, 0, 255)'
    backgroundCtx.fillRect(0, 0, 10, 10)
    const [r, g, b, alpha] = await getFirstPixel(paint.getCurrentImage({ backgroundImage: background }))
    expect([r, g, b, alpha]).toEqual([0, 0, 255, 255])
  }
}

/** zoomToShapes fits the shapes in the displayed canvas, with a margin in pixels of the screen */
export const ZoomToShapes: Story = {
  args: { options: { size: 'infinite' }, containerWidth: 500 },
  play: async ({ canvasElement }) => {
    const drawCanvas = await within(canvasElement).findByTestId('draw-canvas')
    const paint = getPaint()
    // the canvas of 1000 x 600 is displayed at half its size
    await waitFor(() => expect(paint.getState().view.scaleRatio).toBeCloseTo(0.5))

    const [id] = paint.actions.addShapes([{ type: 'rect', x: 100, y: 100, width: 200, height: 50 }])
    paint.actions.zoomToShapes([id!], { padding: 50 })

    // the wide box fills the width of the view, with 50 pixels on each side. The scale ratio includes the zoom
    const { offset, scaleRatio, displayWidth } = paint.getState().view
    const box = paint.getShape(id!)!.computed.boundingBox
    expect((box.x + offset[0]) * scaleRatio).toBeCloseTo(50, 0)
    expect(displayWidth - (box.x + box.width + offset[0]) * scaleRatio).toBeCloseTo(50, 0)

    // the corner of the box is 50 pixels away from the left side of the canvas on the screen, and is found back there
    const canvasRect = drawCanvas.getBoundingClientRect()
    const corner = paint.toClientPosition([box.x, box.y])!
    expect(corner.x).toBeCloseTo(canvasRect.left + 50, 0)
    expect(corner.y).toBeCloseTo(canvasRect.top + (box.y + offset[1]) * scaleRatio, 0)
    const [x, y] = paint.toCanvasPosition(corner)!
    expect(x).toBeCloseTo(box.x)
    expect(y).toBeCloseTo(box.y)
  }
}

/** A group is faded as a whole: its shapes covering each other show the same color through it. A hidden group is not drawn */
export const GroupOpacity: Story = {
  play: async ({ canvasElement }) => {
    const drawCanvas = (await within(canvasElement).findByTestId('draw-canvas')) as HTMLCanvasElement
    const paint = getPaint()
    const style = { fillColor: 'red', strokeColor: 'transparent' }
    const [groupId] = paint.actions.addShapes([
      {
        type: 'group',
        style: { opacity: 50 },
        shapes: [
          { type: 'rect', x: 100, y: 100, width: 200, height: 100, style },
          { type: 'rect', x: 200, y: 100, width: 200, height: 100, style }
        ]
      }
    ])
    await wait(100)
    const alone = getPixel(drawCanvas, [150, 150])
    expect(alone[3]).toBeGreaterThan(110)
    expect(alone[3]).toBeLessThan(145)
    expect(getPixel(drawCanvas, [250, 150])).toEqual(alone)

    paint.actions.setShapesVisibility([groupId!], false)
    await wait(100)
    expect(getPixel(drawCanvas, [250, 150])[3]).toBe(0)
  }
}

/** Without a mounted Canvas, the shapes are still created, measured, transformed and found */
export const ActionsWithoutCanvas: Story = {
  args: { withCanvas: false },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText('no canvas')
    const paint = getPaint()

    const result = paint.batch(() => {
      const [text, rect] = paint.actions.addShapes([
        { type: 'text', x: 0, y: 0, value: ['Some text'], fontSize: 20 },
        { type: 'rect', x: 0, y: 0, width: 10, height: 10, style: { fillColor: 'blue' } }
      ])
      paint.actions.updateShapes([{ id: text!, style: { fontBold: true } }])
      paint.actions.resizeShapes([rect!], { x: 200, y: 200, width: 100, height: 100 })
      paint.actions.transformShapes([text!], 'flipHorizontally')
      return { text: text!, rect: rect! }
    })

    const text = paint.getShape(result.text)
    expect(text?.type === 'text' && text.width).toBeGreaterThan(50)
    expect(text?.style?.fontBold).toBe(true)
    expect(paint.getShapesAt([250, 250]).map(shape => shape.id)).toEqual([result.rect])
    expect(paint.getState().history.canUndo).toBe(true)
    // the positions on the screen need the Canvas
    expect(paint.toClientPosition([250, 250])).toBeUndefined()
    expect(paint.toCanvasPosition({ x: 10, y: 10 })).toBeUndefined()

    paint.actions.undo()
    expect(paint.getState().shapes).toEqual([])
  }
}
