import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ReactPaintWrapper, selectTool } from './../helpers'

const meta = {
  title: 'Tests/Layout',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const getContainerStyle = (canvasElement: HTMLElement) =>
  getComputedStyle(canvasElement.querySelector('.react-paint-canvas-container') as HTMLElement)

export const CssVariablesDefaults: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')

    // without variable, the canvas keeps the values of its options and of the gestures
    expect(getContainerStyle(canvasElement).backgroundColor).toBe('rgb(255, 255, 255)')
    expect(getContainerStyle(canvasElement).cursor).toBe('default')
  }
}

// the variables are set on a parent of the Editor: neither the editor nor the canvas hides them
export const CssVariablesOverride: Story = {
  args: {},
  decorators: [
    Story => (
      <div
        style={{
          '--react-paint-app-canvas-bg': 'rgb(1, 2, 3)',
          '--react-paint-canvas-cursor': 'crosshair',
          '--react-paint-canvas-edittextbox-color': 'rgb(4, 5, 6)'
        }}
      >
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')

    expect(getContainerStyle(canvasElement).backgroundColor).toBe('rgb(1, 2, 3)')
    expect(getContainerStyle(canvasElement).cursor).toBe('crosshair')

    // text edition box
    await selectTool(view, 'text')
    const rect = drawCanvas.getBoundingClientRect()
    const coords = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const user = userEvent.setup()
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords })
    const textbox = await view.findByRole('textbox')
    expect(getComputedStyle(textbox).color).toBe('rgb(4, 5, 6)')
  }
}
