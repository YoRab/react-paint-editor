import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, Editor, type StateData, useReactPaint } from '../../src/index'

const getCurrentDataRef = { current: null as null | (() => StateData) }

const ReactPaintWrapper = (args: Parameters<typeof useReactPaint>[0]) => {
  const { editorProps, canvasProps, getCurrentData } = useReactPaint(args)
  getCurrentDataRef.current = getCurrentData

  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}

const meta = {
  title: 'Tests/Draw',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// Some tools are grouped inside ToolbarGroup panels
const TOOL_GROUPS: Record<string, string> = {
  line: 'lines',
  curve: 'lines',
  polygon: 'lines',
  rect: 'shapes',
  square: 'shapes',
  circle: 'shapes',
  ellipse: 'shapes'
}

async function selectTool(view: ReturnType<typeof within>, toolId: string) {
  let toolButton = view.queryByTestId(`tool-${toolId}`)

  if (!toolButton) {
    // Case 1: toolbar too narrow — "Toggle tools" button is shown
    const toggleBtn = view.queryByRole('button', { name: 'Toggle tools' })
    if (toggleBtn) {
      await userEvent.click(toggleBtn)
    } else {
      // Case 2: tool is inside a group panel — open the group first
      const groupTitle = TOOL_GROUPS[toolId]
      if (groupTitle) {
        const groupBtn = await view.findByRole('button', { name: groupTitle })
        await userEvent.click(groupBtn)
      }
    }
    toolButton = await view.findByTestId(`tool-${toolId}`)
  }

  await userEvent.click(toolButton)
}

function assertNoInternalFields(shape: unknown) {
  expect(shape).not.toHaveProperty('id')
  expect(shape).not.toHaveProperty('path')
  expect(shape).not.toHaveProperty('computed')
  expect(shape).not.toHaveProperty('selection')
}

export const DrawBrushShape: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    // 1. Select the brush tool
    await selectTool(view, 'brush')

    // 2. Find the draw canvas
    const drawCanvas = await view.findByTestId('draw-canvas')

    // Coordinates relative to the canvas position in the viewport
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const r = Math.min(rect.width, rect.height) * 0.2
    const STEPS = 16

    // 3. Mousedown on the canvas (triggers focusin → isInsideCanvas = true)
    const user = userEvent.setup()
    await user.pointer({
      target: drawCanvas,
      keys: '[MouseLeft>]',
      coords: { x: cx + r, y: cy }
    })

    // Let React process focusin and register the mouseup listener on document
    await new Promise(res => setTimeout(res, 50))

    // 4. Draw a circle
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({
        target: drawCanvas,
        coords: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
      })
    }

    // 5. Mouseup → save the stroke
    await user.pointer({
      target: drawCanvas,
      keys: '[/MouseLeft]',
      coords: { x: cx + r, y: cy }
    })
    await new Promise(res => setTimeout(res, 100))

    // 6. Assert exported data
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'brush',
      style: {
        strokeColor: 'black',
        opacity: 100,
        lineWidth: 10,
        lineDash: 0
      }
    })
    assertNoInternalFields(data.shapes![0])
    const brushShape = data.shapes![0] as { points: [number, number][][] }
    expect(brushShape.points).toHaveLength(1)
    expect(brushShape.points[0]!.length).toBeGreaterThan(STEPS * 0.5)
  }
}

export const DrawLine: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'line')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'line',
      style: { strokeColor: 'black', opacity: 100, lineWidth: 1, lineDash: 0, lineArrow: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const lineShape = data.shapes![0] as { points: [number, number][] }
    expect(lineShape.points).toHaveLength(2)
  }
}

export const DrawRect: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'rect')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'rect',
      style: { strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const rectShape = data.shapes![0] as { width: number; height: number }
    expect(rectShape.width).toBeGreaterThan(0)
    expect(rectShape.height).toBeGreaterThan(0)
  }
}

export const DrawSquare: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'square')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 50, y: cy - 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'square',
      style: { strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const squareShape = data.shapes![0] as { width: number; height: number }
    expect(squareShape.width).toBeGreaterThan(0)
    expect(squareShape.width).toBe(squareShape.height)
  }
}

export const DrawCircle: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'circle')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 50, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 50, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 50, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'circle',
      style: { strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const circleShape = data.shapes![0] as { radius: number }
    expect(circleShape.radius).toBeGreaterThan(0)
  }
}

export const DrawEllipse: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'ellipse')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy - 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'ellipse',
      style: { strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const ellipseShape = data.shapes![0] as { radiusX: number; radiusY: number }
    expect(ellipseShape.radiusX).toBeGreaterThan(0)
    expect(ellipseShape.radiusY).toBeGreaterThan(0)
  }
}

export const DrawPolygon: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'polygon')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // Click 3 vertices
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    // Double-click to close the polygon
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx - 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'polygon',
      style: { strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const polygonShape = data.shapes![0] as { points: [number, number][] }
    expect(polygonShape.points.length).toBeGreaterThanOrEqual(3)
  }
}

export const DrawCurve: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'curve')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // Click 3 control points
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    // Double-click to finish the curve
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx + 60, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'curve',
      style: { strokeColor: 'black', fillColor: 'transparent', opacity: 100, lineWidth: 1, lineDash: 0 }
    })
    assertNoInternalFields(data.shapes![0])
    const curveShape = data.shapes![0] as { points: [number, number][] }
    expect(curveShape.points.length).toBeGreaterThanOrEqual(3)
  }
}

export const DrawText: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'text')

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // First click: creates the text shape (tool automatically switches back to selection)
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy } })

    // Second click on the same shape within 300ms → triggers double-click → enters textedition mode
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // The contentEditable is now visible — clear the default value and type
    const textbox = await view.findByRole('textbox')
    await userEvent.clear(textbox)
    await userEvent.type(textbox, 'Hello')
    await new Promise(res => setTimeout(res, 50))

    // Click outside to finalize
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - 150, y: cy - 150 } })
    await new Promise(res => setTimeout(res, 100))

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'text',
      style: { strokeColor: 'black', opacity: 100 }
    })
    assertNoInternalFields(data.shapes![0])
    const textShape = data.shapes![0] as { value: string[] }
    expect(textShape.value).toEqual(['Hello'])
  }
}
