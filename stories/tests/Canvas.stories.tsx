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
  title: 'Tests/Canvas',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

export const DrawBrushShape: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)

    // 1. Sélectionner la brosse (gestion bouton direct ou sous-menu)
    let brushButton = view.queryByTestId('tool-brush')
    if (!brushButton) {
      const toggleBtn = await view.findByRole('button', { name: 'Toggle tools' })
      await userEvent.click(toggleBtn)
      brushButton = await view.findByTestId('tool-brush')
    }
    await userEvent.click(brushButton)

    // 2. Localiser le draw canvas
    const drawCanvas = await view.findByTestId('draw-canvas')

    // Coordonnées relatives à la position du canvas dans le viewport
    const rect = drawCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const r = Math.min(rect.width, rect.height) * 0.2
    const STEPS = 16

    // 3. Mousedown sur le canvas (déclenche focusin → isInsideCanvas = true)
    const user = userEvent.setup()
    await user.pointer({
      target: drawCanvas,
      keys: '[MouseLeft>]',
      coords: { x: cx + r, y: cy }
    })

    // Laisser React traiter focusin et enregistrer le listener mouseup sur document
    await new Promise(res => setTimeout(res, 50))

    // 4. Tracé du cercle
    for (let i = 1; i <= STEPS; i++) {
      const angle = (i / STEPS) * 2 * Math.PI
      await user.pointer({
        target: drawCanvas,
        coords: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
      })
    }

    // 5. Mouseup → sauvegarde du tracé
    await user.pointer({
      target: drawCanvas,
      keys: '[/MouseLeft]',
      coords: { x: cx + r, y: cy }
    })
    await new Promise(res => setTimeout(res, 100))

    // 6. Comparer les données exportées
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
    expect(data.shapes![0]).not.toHaveProperty('id')
    expect(data.shapes![0]).not.toHaveProperty('path')
    expect(data.shapes![0]).not.toHaveProperty('computed')
    expect(data.shapes![0]).not.toHaveProperty('selection')
    const brushShape = data.shapes![0] as { points: [number, number][][] }
    expect(brushShape.points).toHaveLength(1)
    expect(brushShape.points[0]!.length).toBeGreaterThan(STEPS * 0.5)
  }
}
