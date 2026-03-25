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

// Open a settings panel by clicking its trigger button
async function openSettingPanel(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

// Close a settings panel by clicking its trigger button again
async function closeSettingPanel(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

// Select a color in a ColorField panel
async function setColorSetting(view: ReturnType<typeof within>, title: string, color: string) {
  await openSettingPanel(view, title)
  await userEvent.click(await view.findByRole('button', { name: color }))
  await closeSettingPanel(view, title)
}

// Change a range slider by setting the value directly via the native HTMLInputElement
// value setter, then dispatching an 'input' event so React's onChange fires.
// This is necessary in Playwright browser mode where keyboard navigation on
// range inputs is unreliable.
async function setRangeSetting(view: ReturnType<typeof within>, title: string, targetValue: number) {
  await openSettingPanel(view, title)
  const slider = (await view.findByRole('slider')) as HTMLInputElement
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  nativeSetter.call(slider, String(targetValue))
  slider.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise(res => setTimeout(res, 0))
  await closeSettingPanel(view, title)
}

// Select an option in a SelectField panel (pass the option's accessible name)
async function setSelectSetting(view: ReturnType<typeof within>, title: string, optionName: string) {
  await openSettingPanel(view, title)
  await userEvent.click(await view.findByRole('button', { name: optionName }))
  await closeSettingPanel(view, title)
}

// Toggle a ToggleField button (fontBold / fontItalic)
async function setToggleSetting(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
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

    // 2. Modify all brush settings to non-default values
    // strokeColor: 'black' → 'red'
    await setColorSetting(view, 'Couleur du trait', 'red')
    // lineWidth: 10 → 14
    await setRangeSetting(view, 'Epaisseur du trait', 14)
    // lineDash: 0 → 1
    await setSelectSetting(view, 'Type de traits', '1')
    // opacity: 100 → 50
    await setRangeSetting(view, 'Opacité', 50)

    // 3. Find the draw canvas
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const r = Math.min(rect.width, rect.height) * 0.2
    const STEPS = 16

    // 4. Mousedown on the canvas (triggers focusin → isInsideCanvas = true)
    const user = userEvent.setup()
    await user.pointer({
      target: drawCanvas,
      keys: '[MouseLeft>]',
      coords: { x: cx + r, y: cy }
    })

    // Let React process focusin and register the mouseup listener on document
    await new Promise(res => setTimeout(res, 50))

    // 5. Draw a circle
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({
        target: drawCanvas,
        coords: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
      })
    }

    // 6. Mouseup → save the stroke
    await user.pointer({
      target: drawCanvas,
      keys: '[/MouseLeft]',
      coords: { x: cx + r, y: cy }
    })
    await new Promise(res => setTimeout(res, 100))

    // 7. Assert exported data
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({
      type: 'brush',
      style: {
        strokeColor: 'red',
        opacity: 50,
        lineWidth: 14,
        lineDash: 1
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

    // Modify all line settings to non-default values
    // strokeColor: 'black' → 'red'
    await setColorSetting(view, 'Couleur du trait', 'red')
    // lineWidth: 1 → 5
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    // lineDash: 0 → 1
    await setSelectSetting(view, 'Type de traits', '1')
    // lineArrow: 0 → 1
    await setSelectSetting(view, 'Flèches', '1')
    // opacity: 100 → 50
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', opacity: 50, lineWidth: 5, lineDash: 1, lineArrow: 1 }
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

    // Modify all rect settings to non-default values
    // strokeColor: 'black' → 'red'
    await setColorSetting(view, 'Couleur du trait', 'red')
    // fillColor: 'transparent' → 'blue'
    await setColorSetting(view, 'Couleur de fond', 'blue')
    // lineWidth: 1 → 5
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    // lineDash: 0 → 1
    await setSelectSetting(view, 'Type de traits', '1')
    // opacity: 100 → 50
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 }
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

    // Modify all square settings to non-default values
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 }
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

    // Modify all circle settings to non-default values
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 }
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

    // Modify all ellipse settings to non-default values
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 }
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

    // Modify all polygon settings to non-default values
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    // closedPoints: 0 → 1 (accessible name is 'Oui' for value=1)
    await setSelectSetting(view, 'Fermer les points', 'Oui')
    // opacity: 100 → 50
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1, closedPoints: 1 }
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

    // Modify all curve settings to non-default values
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    // closedPoints: 0 → 1 (accessible name is 'Oui' for value=1)
    await setSelectSetting(view, 'Fermer les points', 'Oui')
    // opacity: 100 → 50
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1, closedPoints: 1 }
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

    // Modify all text settings to non-default values
    // strokeColor: 'black' → 'red'
    await setColorSetting(view, 'Couleur du trait', 'red')
    // fontFamily: 'serif' → 'monospace'
    await setSelectSetting(view, 'Police', 'monospace')
    // fontBold: false → true
    await setToggleSetting(view, 'Gras')
    // fontItalic: false → true
    await setToggleSetting(view, 'Italique')
    // opacity: 100 → 50
    await setRangeSetting(view, 'Opacité', 50)

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
      style: { strokeColor: 'red', opacity: 50, fontFamily: 'monospace', fontBold: true, fontItalic: true }
    })
    assertNoInternalFields(data.shapes![0])
    const textShape = data.shapes![0] as { value: string[] }
    expect(textShape.value).toEqual(['Hello'])
  }
}
