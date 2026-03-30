import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import { ReactPaintWrapper, makeCoordConverters, selectTool } from './../helpers'

const meta = {
  title: 'Tests/Layout',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// Text shape centered on canvas (logical size 1000×600).
// x=400, y=250, width=200, height=40 → click center at (500, 270).
const INITIAL_TEXT: DrawableShape = {
  type: 'text',
  x: 400,
  y: 250,
  width: 200,
  height: 40,
  fontSize: 40,
  value: ['Hello'],
  rotation: 0,
  style: {
    strokeColor: '#000000',
    opacity: 100
  }
}

export const Responsive: Story = {
  args: {
    shapes: [INITIAL_TEXT]
  },
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
    const rect = drawCanvas.getBoundingClientRect()
    const { toClientX, toClientY } = makeCoordConverters(rect)
    const user = userEvent.setup()

    // =====================================================================
    // Step 1: Select the text shape (center at canvas (500, 270))
    // =====================================================================
    await selectTool(view, 'selection')
    await user.pointer({
      target: drawCanvas,
      keys: '[MouseLeft]',
      coords: { x: toClientX(500), y: toClientY(270) }
    })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Step 2: Default viewport — toolbar
    // selection + brush + text + undo + redo + clear = 6 [data-testid^="tool-"] buttons
    // =====================================================================
    const defaultToolButtons = canvasElement.querySelectorAll('[data-testid^="tool-"]')
    expect(defaultToolButtons.length).toBe(6)

    // =====================================================================
    // Step 3: Default viewport — settings bar
    // 5 settings (strokeColor, opacity, fontFamily, fontBold, fontItalic) + 1 delete = 6
    // =====================================================================
    const defaultSettingsButtons = canvasElement.querySelectorAll(
      '.react-paint-editor-settings-shrinkable button'
    )
    expect(defaultSettingsButtons.length).toBe(6)

    // =====================================================================
    // Step 4: Shrink the wrapper to 260px — triggers ResizeObserver
    // canvasSize.width drops below 280 → toolsInMenu=true, settingsInMenu=true
    // =====================================================================
    const wrapper = canvasElement.querySelector('[data-testid="resize-wrapper"]') as HTMLElement
    wrapper.style.width = '260px'
    await new Promise(res => setTimeout(res, 200))

    // =====================================================================
    // Step 5: Narrow layout — toolbar changed
    // toolsInMenu=true: only selection has data-testid; "Toggle tools" is visible
    // =====================================================================
    const narrowToolButtons = canvasElement.querySelectorAll('[data-testid^="tool-"]')
    expect(narrowToolButtons.length).toBe(1)

    await view.findByRole('button', { name: 'Toggle tools' })

    // =====================================================================
    // Step 6: Open tools modal — assert 9 tool buttons (all except picture)
    // =====================================================================
    await userEvent.click(await view.findByRole('button', { name: 'Toggle tools' }))
    await new Promise(res => setTimeout(res, 100))

    const toolsModal = canvasElement.querySelector('.react-paint-editor-toolbar-modal')
    expect(toolsModal).not.toBeNull()
    expect(toolsModal!.querySelectorAll('button').length).toBe(9)

    // =====================================================================
    // Step 7: Close tools modal by clicking the mask
    // =====================================================================
    await userEvent.click(canvasElement.querySelector('.react-paint-editor-modal-mask') as HTMLElement)
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Step 8: Narrow layout — settings bar
    // settingsInMenu=true: "Toggle settings" button + delete button = 2
    // =====================================================================
    const narrowSettingsButtons = canvasElement.querySelectorAll(
      '.react-paint-editor-settings-shrinkable button'
    )
    expect(narrowSettingsButtons.length).toBe(2)

    // =====================================================================
    // Step 9: Open settings modal — assert 5 settings buttons
    // (strokeColor, opacity, fontFamily, fontBold, fontItalic)
    // =====================================================================
    await userEvent.click(await view.findByRole('button', { name: 'Toggle settings' }))
    await new Promise(res => setTimeout(res, 100))

    const settingsModal = canvasElement.querySelector('.react-paint-editor-settings-modal')
    expect(settingsModal).not.toBeNull()
    expect(settingsModal!.querySelectorAll('button').length).toBe(5)

    // =====================================================================
    // Step 10: Close settings modal by clicking the mask
    // =====================================================================
    const masks = canvasElement.querySelectorAll('.react-paint-editor-modal-mask')
    await userEvent.click(masks[masks.length - 1] as HTMLElement)
    await new Promise(res => setTimeout(res, 100))
  }
}
