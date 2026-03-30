import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { ReactPaintWrapper } from './../helpers'

const meta = {
  title: 'Tests/Layout',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

export const CanvasResizeCanShrinkFalse: Story = {
  args: { options: { canShrink: false } },
  decorators: [
    Story => (
      <div data-testid='resize-wrapper'>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const wrapper = canvasElement.querySelector('[data-testid="resize-wrapper"]') as HTMLElement

    // =====================================================================
    // Step 1: Assert initial canvas size (full layout)
    // =====================================================================
    const initialWidth = drawCanvas.getBoundingClientRect().width
    const initialHeight = drawCanvas.getBoundingClientRect().height
    expect(initialWidth).toBeGreaterThan(280)

    // =====================================================================
    // Step 2: Shrink wrapper to 260px
    // =====================================================================
    wrapper.style.width = '260px'
    await new Promise(res => setTimeout(res, 200))

    // =====================================================================
    // Step 3: Assert canvas size has NOT shrunk (canShrink: false)
    // =====================================================================
    expect(drawCanvas.getBoundingClientRect().width).toBeGreaterThanOrEqual(initialWidth)
    expect(drawCanvas.getBoundingClientRect().height).toBeGreaterThanOrEqual(initialHeight)

    // =====================================================================
    // Step 4: Restore original wrapper width
    // =====================================================================
    wrapper.style.width = ''
    await new Promise(res => setTimeout(res, 200))
  }
}

export const CanvasResizeCanGrowFalse: Story = {
  args: { options: { canGrow: false } },
  decorators: [
    Story => (
      <div data-testid='resize-wrapper'>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const wrapper = canvasElement.querySelector('[data-testid="resize-wrapper"]') as HTMLElement

    // =====================================================================
    // Step 1: Assert initial canvas size (full layout)
    // =====================================================================
    const initialWidth = drawCanvas.getBoundingClientRect().width
    const initialHeight = drawCanvas.getBoundingClientRect().height

    // =====================================================================
    // Step 2: Expand wrapper to 2000px
    // =====================================================================
    wrapper.style.width = '2000px'
    await new Promise(res => setTimeout(res, 200))

    // =====================================================================
    // Step 3: Assert canvas size has NOT grown (canGrow: false)
    // =====================================================================
    expect(drawCanvas.getBoundingClientRect().width).toBeCloseTo(initialWidth, 0)
    expect(drawCanvas.getBoundingClientRect().height).toBeCloseTo(initialHeight, 0)

    // =====================================================================
    // Step 4: Restore original wrapper width
    // =====================================================================
    wrapper.style.width = ''
    await new Promise(res => setTimeout(res, 200))
  }
}

export const CanvasResize: Story = {
  args: {},
  decorators: [
    Story => (
      <div data-testid='resize-wrapper'>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const wrapper = canvasElement.querySelector('[data-testid="resize-wrapper"]') as HTMLElement

    // =====================================================================
    // Step 1: Assert initial canvas size (full layout)
    // =====================================================================
    const initialWidth = drawCanvas.getBoundingClientRect().width
    const initialHeight = drawCanvas.getBoundingClientRect().height
    expect(initialWidth).toBeGreaterThan(280)

    // =====================================================================
    // Step 2: Shrink wrapper to 260px — triggers ResizeObserver
    // =====================================================================
    wrapper.style.width = '260px'
    await new Promise(res => setTimeout(res, 200))

    // =====================================================================
    // Step 3: Assert canvas size is now narrow (< 280)
    // =====================================================================
    expect(drawCanvas.getBoundingClientRect().width).toBeLessThan(280)
    expect(drawCanvas.getBoundingClientRect().height).toBeLessThan(initialHeight)

    // =====================================================================
    // Step 4: Restore original wrapper width
    // =====================================================================
    wrapper.style.width = ''
    await new Promise(res => setTimeout(res, 200))

    // =====================================================================
    // Step 5: Assert canvas size is restored to its initial value
    // =====================================================================
    expect(drawCanvas.getBoundingClientRect().width).toBeCloseTo(initialWidth, 0)
    expect(drawCanvas.getBoundingClientRect().height).toBeCloseTo(initialHeight, 0)
  }
}
