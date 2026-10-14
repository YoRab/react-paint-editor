import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { Canvas, Editor, usePaintState, useReactPaint } from '../../../src/index'

/** Gives the options inline, as a new object on each render, which must not reset the tools */
const InlineOptionsHarness = () => {
  const [renders, setRenders] = useState(0)
  const paint = useReactPaint({ options: { availableTools: [{ type: 'rect', id: 'react-paint-rect' }] } })
  const rectTool = usePaintState(paint, state => state.tools.find(tool => tool.id === 'react-paint-rect'))
  const strokeColor = rectTool && 'strokeColor' in rectTool.settings ? rectTool.settings.strokeColor.default : ''

  return (
    <div>
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
      <button type='button' onClick={() => paint.actions.updateToolSettings('react-paint-rect', 'strokeColor', 'blue')}>
        Blue stroke
      </button>
      <button type='button' onClick={() => setRenders(count => count + 1)}>
        Rerender
      </button>
      <output data-testid='renders'>{renders}</output>
      <output data-testid='stroke-color'>{strokeColor}</output>
    </div>
  )
}

const meta = {
  title: 'Tests/Manipulation',
  component: InlineOptionsHarness,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof InlineOptionsHarness>

export default meta
type Story = StoryObj<typeof meta>

export const InlineOptions: Story = {
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const strokeColor = await view.findByTestId('stroke-color')
    const click = async (name: string) => {
      await userEvent.click(await view.findByRole('button', { name }))
      await new Promise(res => setTimeout(res, 50))
    }

    expect(strokeColor).toHaveTextContent('black')
    await click('Blue stroke')
    expect(strokeColor).toHaveTextContent('blue')

    // --- A render of the host gives new options, equal in value: the tool settings are kept ---
    await click('Rerender')
    await click('Rerender')
    expect(await view.findByTestId('renders')).toHaveTextContent('2')
    expect(strokeColor).toHaveTextContent('blue')
  }
}
