import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { CustomEditor as CustomEditorExample } from '../../examples/custom-ui/CustomEditor'
import { wait } from '../helpers'

const meta = {
  title: 'Tests/Examples/CustomEditor',
  component: CustomEditorExample,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof CustomEditorExample>

export default meta
type Story = StoryObj<typeof meta>

export const CustomEditor: Story = {
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const layers = await view.findByRole('list', { name: 'Layers' })

    // --- Draw a rect with the custom toolbar ---
    await userEvent.click(await view.findByRole('button', { name: 'rect' }))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: cx - 60, y: cy - 40 } })
    await wait(50)
    await user.pointer({ target: drawCanvas, coords: { x: cx + 60, y: cy + 40 } })
    await wait(50)
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: cx + 60, y: cy + 40 } })
    await wait(100)

    expect(within(layers).getAllByRole('listitem')).toHaveLength(1)
    expect(within(layers).getByRole('listitem')).toHaveAttribute('data-selected', 'true')
    expect(await view.findByRole('button', { name: 'select' })).toHaveAttribute('aria-pressed', 'true')

    // --- Change its style, then undo ---
    await userEvent.click(await view.findByRole('button', { name: 'red' }))
    expect(within(layers).getByRole('listitem')).toHaveTextContent('rect - red')
    await userEvent.click(await view.findByRole('button', { name: 'undo' }))
    expect(within(layers).getByRole('listitem')).toHaveTextContent('rect - black')

    // --- The editor reacts to the hovered shape ---
    await user.pointer({ target: drawCanvas, coords: { x: cx + 10, y: cy + 10 } })
    await wait(100)
    expect(within(layers).getByRole('listitem')).toHaveAttribute('data-hovered', 'true')

    // --- Custom context menu ---
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: cx + 10, y: cy + 10 } })
    await userEvent.click(await view.findByRole('menuitem', { name: 'duplicate' }))
    await wait(100)
    expect(within(layers).getAllByRole('listitem')).toHaveLength(2)
    expect(view.queryByRole('menu')).toBeNull()
  }
}
