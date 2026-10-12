import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, type DrawableShape, Editor, type UseReactPaintOptions, type UseReactPaintProps, useReactPaint } from '../../../src/index'
import { selectTool } from './../helpers'

const SQUARE_STYLE = { fillColor: 'red', strokeColor: 'black', lineWidth: 1, opacity: 100, lineDash: 0, lineArrow: 0, closedPoints: 0 }

const SQUARES: DrawableShape[] = [
  { type: 'square', x: 200, y: 250, width: 100, height: 100, rotation: 0, style: SQUARE_STYLE },
  { type: 'square', x: 600, y: 250, width: 100, height: 100, rotation: 0, style: SQUARE_STYLE }
]

const RED_RECT_TOOLS: UseReactPaintOptions['availableTools'] = [
  { type: 'rect', id: 'react-paint-rect', settings: { strokeColor: { default: 'red' } } }
]
const BRUSH_TOOLS: UseReactPaintOptions['availableTools'] = [{ type: 'brush', id: 'react-paint-brush' }]

/** Drives the editor contract directly, and shows the parts of the state under test */
const ContractHarness = (props: UseReactPaintProps) => {
  const [tools, setTools] = useState<UseReactPaintOptions['availableTools']>(undefined)
  const { editorProps, canvasProps } = useReactPaint({ ...props, options: tools && { availableTools: tools } })
  const { state, actions } = editorProps
  const ids = state.shapes.map(shape => shape.id)
  const { activeTool } = state
  const strokeColor = 'settings' in activeTool && 'strokeColor' in activeTool.settings ? activeTool.settings.strokeColor.default : ''

  return (
    <div>
      <Editor editorProps={editorProps}>
        <Canvas canvasProps={canvasProps} />
      </Editor>
      <button type='button' onClick={() => actions.setShapesVisibility(ids, false)}>
        Hide all
      </button>
      <button type='button' onClick={() => actions.setShapesVisibility(ids, true)}>
        Show all
      </button>
      <button type='button' onClick={() => actions.setShapesLocked(ids, true)}>
        Lock all
      </button>
      <button type='button' onClick={() => setTools(RED_RECT_TOOLS)}>
        Red rect tools
      </button>
      <button type='button' onClick={() => setTools(BRUSH_TOOLS)}>
        Brush tools
      </button>
      <button type='button' onClick={() => actions.selectTool('unknown-tool')}>
        Select unknown tool
      </button>
      <output data-testid='shapes-state'>
        {state.shapes.map(shape => `${shape.visible === false ? 'hidden' : 'visible'}/${shape.locked ? 'locked' : 'unlocked'}`).join(',')}
      </output>
      <output data-testid='active-tool'>{`${activeTool.id}:${strokeColor}`}</output>
    </div>
  )
}

const meta = {
  title: 'Tests/Manipulation',
  component: ContractHarness,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ContractHarness>

export default meta
type Story = StoryObj<typeof meta>

export const EditorContract: Story = {
  args: {
    shapes: SQUARES
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const shapesState = await view.findByTestId('shapes-state')
    const activeTool = await view.findByTestId('active-tool')
    const click = async (name: string) => {
      await userEvent.click(await view.findByRole('button', { name }))
      await new Promise(res => setTimeout(res, 50))
    }

    // --- setShapesVisibility / setShapesLocked set a value, whatever the current one ---
    expect(shapesState).toHaveTextContent('visible/unlocked,visible/unlocked')
    await click('Hide all')
    expect(shapesState).toHaveTextContent('hidden/unlocked,hidden/unlocked')
    await click('Hide all')
    expect(shapesState).toHaveTextContent('hidden/unlocked,hidden/unlocked')
    await click('Show all')
    expect(shapesState).toHaveTextContent('visible/unlocked,visible/unlocked')
    await click('Lock all')
    await click('Lock all')
    expect(shapesState).toHaveTextContent('visible/locked,visible/locked')

    // --- The active tool follows the tools given in props ---
    await selectTool(view, 'rect')
    await new Promise(res => setTimeout(res, 50))
    expect(activeTool).toHaveTextContent('react-paint-rect:black')
    await click('Red rect tools')
    expect(activeTool).toHaveTextContent('react-paint-rect:red')

    // --- An unknown tool is ignored ---
    await click('Select unknown tool')
    expect(activeTool).toHaveTextContent('react-paint-rect:red')

    // --- When the active tool is removed from the tools, the selection tool is active ---
    await click('Brush tools')
    expect(activeTool).toHaveTextContent('react-paint-selection:')
  }
}
