import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, Editor, type DrawableShape, type StateData, useReactPaint } from '../../src/index'

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
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

async function selectTool(view: ReturnType<typeof within>, toolId: string) {
  let toolButton = view.queryByTestId(`tool-${toolId}`)

  if (!toolButton) {
    const toggleBtn = view.queryByRole('button', { name: 'Toggle tools' })
    if (toggleBtn) {
      await userEvent.click(toggleBtn)
    } else {
      const groupTitles: Record<string, string> = {
        line: 'lines',
        curve: 'lines',
        polygon: 'lines',
        rect: 'shapes',
        square: 'shapes',
        circle: 'shapes',
        ellipse: 'shapes'
      }
      const groupTitle = groupTitles[toolId]
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

// 100×100 filled square centered on the default 1000×600 canvas (center at canvas coords 500, 300).
// A non-transparent fill is required so that clicking anywhere inside the shape selects it
// (otherwise only clicks on the stroke would register via isPointInStroke).
const INITIAL_SQUARE: DrawableShape = {
  type: 'square',
  x: 450,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: '#4a90d9',
    opacity: 100,
    lineWidth: 2
  }
}

export const SelectRotateResizeTranslate: Story = {
  args: {
    shapes: [INITIAL_SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()

    // Helpers to convert logical canvas coordinates (1000×600) to client pixel coordinates.
    // The canvas element may be scaled by CSS (max-width:100%), so we apply the scale factor.
    const toClientX = (canvasX: number) => rect.left + (canvasX * rect.width) / 1000
    const toClientY = (canvasY: number) => rect.top + (canvasY * rect.height) / 600

    const user = userEvent.setup()

    // --- Step 1: Select the square ---
    // The square is filled, so clicking anywhere inside it (center: canvas 500, 300) selects it.
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(500), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 2: Rotate 45° (π/4 radians) ---
    // SELECTION_ANCHOR_SIZE=14, SELECTION_ROTATED_ANCHOR_POSITION=16
    // Rotate handle rect: x∈[493,507], y∈[220,234] in canvas coords (center at 500, 227).
    // The shape has rotation=0, so the visual position equals the local position.
    //
    // To add π/4 rotation, drag so that:
    //   atan2(300 - endY, 500 - endX) = atan2(300 - 227, 500 - 500) + π/4 = π/2 + π/4 = 3π/4
    // → endX = 500 + 73·cos(3π/4) ≈ 500 - 51.6 ≈ 448
    //
    // Wait — recompute: atan2(300 - endY, 500 - endX) = 3π/4
    //   dy = 300 - endY = 73·sin(3π/4) = 73·(√2/2) ≈ 51.6  → endY ≈ 248
    //   dx = 500 - endX = 73·cos(3π/4) = 73·(-√2/2) ≈ -51.6 → endX ≈ 552
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(500), y: toClientY(227) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(552), y: toClientY(248) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(552), y: toClientY(248) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 3: Halve the size via the bottom-right resize handle ---
    // After rotation=π/4, the bottom-right handle (local canvas 550, 350) appears at a visually
    // rotated position. The hit detection de-rotates the cursor by π/4 before checking anchors,
    // so to hit local position (550, 350) we must provide the visually rotated client position:
    //   cursor_visual = rotatePoint({origin:(500,300), point:(550,350), rotation:-π/4})
    //   With the project's rotatePoint convention (x↔y swap):
    //     relative = (50, 50)
    //     rotatedX = 50·sin(-π/4) + 50·cos(-π/4) = 0
    //     rotatedY = 50·cos(-π/4) - 50·sin(-π/4) = 50·√2 ≈ 70.7
    //   → visual canvas (500, 371)
    //
    // Drag end: canvas (500, 300) = shape center. De-rotated, this stays (500, 300), which sets
    // the new bottom-right corner to (500, 300), giving width = 500-450 = 50, height = 300-250 = 50.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(500), y: toClientY(371) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(500), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(500), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 4: Translate ~30px to the left ---
    // After resize the shape is 50×50 at canvas (450, 250); its center is at canvas (475, 275).
    // Dragging the center 30 canvas pixels to the left moves x from 450 to 420.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(475), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(445), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(445), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Assertions ---
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(1)

    const shape = data.shapes![0] as { type: string; x: number; y: number; width: number; height: number; rotation: number }
    assertNoInternalFields(data.shapes![0])

    expect(shape.type).toBe('square')
    // Rotation ≈ π/4 (45°)
    expect(shape.rotation).toBeCloseTo(Math.PI / 4, 1)
    // Size halved: 100×100 → 50×50
    // Position is now 475
    expect(shape.width).toBeCloseTo(50, 0)
    expect(shape.height).toBeCloseTo(50, 0)
    // Translated 30px to the left: x was 475, now ≈ 445
    expect(shape.x).toBeCloseTo(445, 0)
  }
}
