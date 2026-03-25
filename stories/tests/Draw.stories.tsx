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

// Horizontal distance from canvas center to each shape's center.
// Both shapes are centered in the canvas: one at cx-OFFSET, the other at cx+OFFSET.
const OFFSET = 120

export const DrawBrushShape: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'brush')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setRangeSetting(view, 'Epaisseur du trait', 14)
    await setSelectSetting(view, 'Type de traits', '1')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const r = Math.min(rect.width, rect.height) * 0.15
    const STEPS = 16

    const user = userEvent.setup()

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    const cx1 = cx - OFFSET
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx1 + r, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({ target: drawCanvas, coords: { x: cx1 + r * Math.cos(angle), y: cy + r * Math.sin(angle) } })
    }
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx1 + r, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, inherits shape 1's tool settings) ---
    const cx2 = cx + OFFSET
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx2 + r, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({ target: drawCanvas, coords: { x: cx2 + r * Math.cos(angle), y: cy + r * Math.sin(angle) } })
    }
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx2 + r, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Select shape 2 (brush does not auto-select, switch to selection tool and click on the stroke) ---
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx2 + r, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setRangeSetting(view, 'Epaisseur du trait', 8)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'brush', style: { strokeColor: 'red', opacity: 50, lineWidth: 14, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    const brush1 = data.shapes![1] as { points: [number, number][][] }
    expect(brush1.points).toHaveLength(1)
    expect(brush1.points[0]!.length).toBeGreaterThan(STEPS * 0.5)

    expect(data.shapes![0]).toMatchObject({ type: 'brush', style: { strokeColor: 'green', opacity: 75, lineWidth: 8, lineDash: 2 } })
    assertNoInternalFields(data.shapes![0])
    const brush2 = data.shapes![0] as { points: [number, number][][] }
    expect(brush2.points).toHaveLength(1)
    expect(brush2.points[0]!.length).toBeGreaterThan(STEPS * 0.5)
  }
}

export const DrawLine: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'line')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setSelectSetting(view, 'Flèches', '1')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'line')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setSelectSetting(view, 'Flèches', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'line', style: { strokeColor: 'red', opacity: 50, lineWidth: 5, lineDash: 1, lineArrow: 1 } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { points: unknown[] }).points).toHaveLength(2)

    expect(data.shapes![0]).toMatchObject({ type: 'line', style: { strokeColor: 'green', opacity: 75, lineWidth: 10, lineDash: 2, lineArrow: 2 } })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { points: unknown[] }).points).toHaveLength(2)
  }
}

export const DrawRect: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'rect')

    // --- Shape 1 settings ---
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

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'rect')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 60, y: cy - 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'rect', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { width: number; height: number }).width).toBeGreaterThan(0)
    expect((data.shapes![1] as { width: number; height: number }).height).toBeGreaterThan(0)

    expect(data.shapes![0]).toMatchObject({ type: 'rect', style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 } })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { width: number; height: number }).width).toBeGreaterThan(0)
    expect((data.shapes![0] as { width: number; height: number }).height).toBeGreaterThan(0)
  }
}

export const DrawSquare: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'square')

    // --- Shape 1 settings ---
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

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 50, y: cy - 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'square')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 50, y: cy - 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 50, y: cy + 50 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'square', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    const sq1 = data.shapes![1] as { width: number; height: number }
    expect(sq1.width).toBeGreaterThan(0)
    expect(sq1.width).toBe(sq1.height)

    expect(data.shapes![0]).toMatchObject({ type: 'square', style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 } })
    assertNoInternalFields(data.shapes![0])
    const sq2 = data.shapes![0] as { width: number; height: number }
    expect(sq2.width).toBeGreaterThan(0)
    expect(sq2.width).toBe(sq2.height)
  }
}

export const DrawCircle: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'circle')

    // --- Shape 1 settings ---
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

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 50, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 50, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 50, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'circle')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 50, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 50, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 50, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'circle', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { radius: number }).radius).toBeGreaterThan(0)

    expect(data.shapes![0]).toMatchObject({ type: 'circle', style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 } })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { radius: number }).radius).toBeGreaterThan(0)
  }
}

export const DrawEllipse: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'ellipse')

    // --- Shape 1 settings ---
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

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - OFFSET - 60, y: cy - 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx - OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'ellipse')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx + OFFSET - 60, y: cy - 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: cx + OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy + 30 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'ellipse', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1 } })
    assertNoInternalFields(data.shapes![1])
    const el1 = data.shapes![1] as { radiusX: number; radiusY: number }
    expect(el1.radiusX).toBeGreaterThan(0)
    expect(el1.radiusY).toBeGreaterThan(0)

    expect(data.shapes![0]).toMatchObject({ type: 'ellipse', style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2 } })
    assertNoInternalFields(data.shapes![0])
    const el2 = data.shapes![0] as { radiusX: number; radiusY: number }
    expect(el2.radiusX).toBeGreaterThan(0)
    expect(el2.radiusY).toBeGreaterThan(0)
  }
}

export const DrawPolygon: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'polygon')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setSelectSetting(view, 'Fermer les points', 'Oui')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (triangle centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx - OFFSET - 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (triangle centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'polygon')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx + OFFSET - 60, y: cy + 40 } })
    await new Promise(res => setTimeout(res, 100))
    // Exit drawing mode, then click the shape to select it
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy + 7 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setSelectSetting(view, 'Fermer les points', 'Non')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'polygon', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1, closedPoints: 1 } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { points: unknown[] }).points.length).toBeGreaterThanOrEqual(3)

    expect(data.shapes![0]).toMatchObject({ type: 'polygon', style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2, closedPoints: 0 } })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { points: unknown[] }).points.length).toBeGreaterThanOrEqual(3)
  }
}

export const DrawCurve: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'curve')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setColorSetting(view, 'Couleur de fond', 'blue')
    await setRangeSetting(view, 'Epaisseur du trait', 5)
    await setSelectSetting(view, 'Type de traits', '1')
    await setSelectSetting(view, 'Fermer les points', 'Oui')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (centered at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET - 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx - OFFSET + 60, y: cy } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (centered at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'curve')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET - 60, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy - 60 } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft][MouseLeft]', coords: { x: cx + OFFSET + 60, y: cy } })
    await new Promise(res => setTimeout(res, 100))
    // Exit drawing mode, then click the shape to select it
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy - 20 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Shape 2 settings (shape 2 is now selected) ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setColorSetting(view, 'Couleur de fond', 'yellow')
    await setRangeSetting(view, 'Epaisseur du trait', 10)
    await setSelectSetting(view, 'Type de traits', '2')
    await setSelectSetting(view, 'Fermer les points', 'Non')
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'curve', style: { strokeColor: 'red', fillColor: 'blue', opacity: 50, lineWidth: 5, lineDash: 1, closedPoints: 1 } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { points: unknown[] }).points.length).toBeGreaterThanOrEqual(3)

    expect(data.shapes![0]).toMatchObject({ type: 'curve', style: { strokeColor: 'green', fillColor: 'yellow', opacity: 75, lineWidth: 10, lineDash: 2, closedPoints: 0 } })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { points: unknown[] }).points.length).toBeGreaterThanOrEqual(3)
  }
}

export const DrawText: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await selectTool(view, 'text')

    // --- Shape 1 settings ---
    await setColorSetting(view, 'Couleur du trait', 'red')
    await setSelectSetting(view, 'Police', 'monospace')
    await setToggleSetting(view, 'Gras')
    await setToggleSetting(view, 'Italique')
    await setRangeSetting(view, 'Opacité', 50)

    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const user = userEvent.setup()

    // --- Draw shape 1 (at cx - OFFSET) ---
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx - OFFSET, y: cy } })
    await new Promise(res => setTimeout(res, 100))
    const textbox1 = await view.findByRole('textbox')
    await userEvent.clear(textbox1)
    await userEvent.type(textbox1, 'Hello')
    await new Promise(res => setTimeout(res, 50))
    // Click away to finalize shape 1
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx, y: cy - 150 } })
    await new Promise(res => setTimeout(res, 100))

    // --- Draw shape 2 (at cx + OFFSET, with shape 1's settings) ---
    await selectTool(view, 'text')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: cx + OFFSET, y: cy } })
    await new Promise(res => setTimeout(res, 100))
    const textbox2 = await view.findByRole('textbox')
    await userEvent.clear(textbox2)
    await userEvent.type(textbox2, 'World')
    await new Promise(res => setTimeout(res, 50))

    // --- Shape 2 settings (clicking settings blurs the textbox, saving "World") ---
    await setColorSetting(view, 'Couleur du trait', 'green')
    await setSelectSetting(view, 'Police', 'arial')
    await setToggleSetting(view, 'Gras')    // toggle back to false
    await setToggleSetting(view, 'Italique') // toggle back to false
    await setRangeSetting(view, 'Opacité', 75)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(2)

    expect(data.shapes![1]).toMatchObject({ type: 'text', style: { strokeColor: 'red', opacity: 50, fontFamily: 'monospace', fontBold: true, fontItalic: true } })
    assertNoInternalFields(data.shapes![1])
    expect((data.shapes![1] as { value: string[] }).value).toEqual(['Hello'])

    expect(data.shapes![0]).toMatchObject({ type: 'text', style: { strokeColor: 'green', opacity: 75, fontFamily: 'arial', fontBold: false, fontItalic: false } })
    assertNoInternalFields(data.shapes![0])
    expect((data.shapes![0] as { value: string[] }).value).toEqual(['World'])
  }
}

// A small inline SVG used as a data-URI for the URL picture test.
// isSvg() checks for '.svg' in the string — this URL doesn't match, so the
// non-SVG fetch path is taken. The original URL is stored as shape.src, and
// since it contains '<svg', cleanShapesBeforeExport keeps it verbatim.
const SVG_DATA_URI =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='blue'/></svg>"

// SVG content used for the file-upload test.
const SVG_CONTENT =
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='green'/></svg>"

export const AddPictureFromUrl: Story = {
  args: { options: { withUrlPicture: true } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    // Open the menu
    await userEvent.click(await view.findByTitle('Menu'))

    // Click "Add picture from URL" — opens the URL modal
    await userEvent.click(await view.findByRole('button', { name: 'Add picture from URL' }))

    // Fill in the URL input and submit
    const urlInput = await view.findByRole('textbox')
    await userEvent.clear(urlInput)
    await userEvent.type(urlInput, SVG_DATA_URI)
    await userEvent.click(await view.findByRole('button', { name: 'Ajouter' }))

    // Wait for the image to load and the shape to be added (auto-selected)
    await new Promise(res => setTimeout(res, 500))

    // --- Change opacity on the selected picture ---
    await setRangeSetting(view, 'Opacité', 60)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({ type: 'picture', style: { opacity: 60 } })
    assertNoInternalFields(data.shapes![0])
    const pic = data.shapes![0] as { width: number; height: number; src: string }
    expect(pic.width).toBeGreaterThan(0)
    expect(pic.height).toBeGreaterThan(0)
    expect(pic.src).toContain('<svg')
  }
}

export const AddPictureFromUpload: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    const file = new File([SVG_CONTENT], 'test.svg', { type: 'image/svg+xml' })

    // Open the menu
    await userEvent.click(await view.findByTitle('Menu'))

    // Upload the file via the hidden file input inside the "Upload picture" label
    const uploadLabel = await view.findByTitle('Upload picture')
    await userEvent.upload(uploadLabel, file)

    // Wait for the image to load and the shape to be added (auto-selected)
    await new Promise(res => setTimeout(res, 500))

    // --- Change opacity on the selected picture ---
    await setRangeSetting(view, 'Opacité', 40)

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)
    expect(data.shapes![0]).toMatchObject({ type: 'picture', style: { opacity: 40 } })
    assertNoInternalFields(data.shapes![0])
    const pic = data.shapes![0] as { width: number; height: number; src: string }
    expect(pic.width).toBeGreaterThan(0)
    expect(pic.height).toBeGreaterThan(0)
    expect(pic.src).toContain('<svg')
  }
}
