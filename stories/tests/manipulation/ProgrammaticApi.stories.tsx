import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Canvas, type ShapeEntity, type UseReactPaintProps, useReactPaint } from '../../../src/index'
import { getPaint, makeCoordConverters, paintRef } from './../helpers'

/** Ids of the shapes given to shapeClicked / shapeHovered, by the last rendered harness */
const shapeEvents: { name: 'clicked' | 'hovered'; id: string | undefined }[] = []

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
    const unregisterClick = paint.registerEvent('shapeClicked', (shape: ShapeEntity) => shapeEvents.push({ name: 'clicked', id: shape.id }))
    const unregisterHover = paint.registerEvent('shapeHovered', (shape: ShapeEntity | undefined) =>
      shapeEvents.push({ name: 'hovered', id: shape?.id })
    )
    return () => {
      unregisterClick()
      unregisterHover()
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
    await waitFor(() => expect(shapeEvents).toContainEqual({ name: 'hovered', id: rect }))
    expect(drawCanvas.style.cursor).toBe('pointer')
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(500), y: toClientY(500) } })
    await waitFor(() => expect(shapeEvents[shapeEvents.length - 1]).toEqual({ name: 'hovered', id: undefined }))
    expect(drawCanvas.style.cursor).toBe('')

    // a click on the shape, and on the empty canvas
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(150), y: toClientY(150) } })
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(500), y: toClientY(500) } })
    expect(shapeEvents.filter(event => event.name === 'clicked')).toEqual([{ name: 'clicked', id: rect }])
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
    await within(canvasElement).findByTestId('draw-canvas')
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

    paint.actions.undo()
    expect(paint.getState().shapes).toEqual([])
  }
}
