import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import { getPaint, getRootIds, getState, makeCoordConverters, ReactPaintWrapper } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const STYLE = { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }
const SQUARE: DrawableShape = { type: 'square', x: 250, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }

const SVG_CONTENT = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='green'/></svg>"

/** Like the browser, dispatches a clipboard event with its data on the focused element */
const dispatchClipboard = (type: 'copy' | 'paste', clipboardData = new DataTransfer()) => {
  const event = new ClipboardEvent(type, { clipboardData, bubbles: true, cancelable: true })
  ;(document.activeElement ?? document.body).dispatchEvent(event)
  return { event, clipboardData }
}

export const EditorShortcuts: Story = {
  args: {
    shapes: [SQUARE],
    editorOptions: { withLoadAndSave: true, withExport: true, withEraser: true, withLaser: true }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    const isMac = navigator.userAgent.includes('Macintosh')

    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(700), y: toClientY(100) } })
    expect(document.activeElement).toBe(drawCanvas)

    // =====================================================================
    // A letter chooses a tool, Shift its regular variant
    // =====================================================================

    await user.keyboard('r')
    expect(getState().activeTool.id).toBe('react-paint-rect')
    await user.keyboard('{Shift>}R{/Shift}')
    expect(getState().activeTool.id).toBe('react-paint-square')
    await user.keyboard('o')
    expect(getState().activeTool.id).toBe('react-paint-ellipse')
    await user.keyboard('{Shift>}O{/Shift}')
    expect(getState().activeTool.id).toBe('react-paint-circle')
    await user.keyboard('l')
    expect(getState().activeTool.id).toBe('react-paint-line')
    await user.keyboard('e')
    expect(getState().activeTool.id).toBe('react-paint-eraser')
    await user.keyboard('k')
    expect(getState().activeTool.id).toBe('react-paint-laser')
    await user.keyboard('t')
    expect(getState().activeTool.id).toBe('react-paint-text')
    await user.keyboard('v')
    expect(getState().activeTool.id).toBe('react-paint-selection')
    // a letter with Ctrl is not a tool
    await user.keyboard('{Control>}b{/Control}')
    expect(getState().activeTool.id).toBe('react-paint-selection')

    // the group of the tool chosen shows it, and keeps its icon once another tool is chosen
    await user.keyboard('{Shift>}O{/Shift}')
    const shapesGroup = view.getByRole('button', { name: 'Shapes' })
    expect(shapesGroup).toHaveAttribute('data-selected', '1')
    const circleIcon = shapesGroup.innerHTML
    await user.keyboard('r')
    expect(shapesGroup.innerHTML).not.toBe(circleIcon)
    await user.keyboard('{Shift>}O{/Shift}v')
    expect(shapesGroup).not.toHaveAttribute('data-selected', '1')
    expect(shapesGroup.innerHTML).toBe(circleIcon)

    // the buttons tell their shortcut, their name staying their label
    const rectButton = view.queryByTestId('tool-rect')
    if (rectButton) {
      expect(rectButton).toHaveAttribute('title', 'Rectangle (R)')
      expect(rectButton).toHaveAttribute('aria-keyshortcuts', 'R')
      expect(rectButton).toHaveAccessibleName('Rectangle')
    }
    const undoButton = view.queryByTestId('tool-undo')
    if (undoButton) {
      expect(undoButton).toHaveAttribute('aria-keyshortcuts', isMac ? 'Meta+Z' : 'Control+Z')
      expect(undoButton).toHaveAccessibleName('Undo')
    }

    // =====================================================================
    // The letters are left to a text being edited
    // =====================================================================

    const [textId] = getPaint().actions.addShapes([{ type: 'text', x: 600, y: 300, value: ['Hi'], rotation: 0 }])
    getPaint().actions.editText(textId!)
    await waitFor(() => expect(getState().interaction.mode).toBe('textedition'))
    await user.keyboard('r')
    expect(getState().activeTool.id).toBe('react-paint-selection')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(document.activeElement).toBe(drawCanvas))

    // =====================================================================
    // ? lists the shortcuts, in a modal which keeps the letters
    // =====================================================================

    await user.keyboard('?')
    const help = await view.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(help).getByText('Duplicate')).toBeInTheDocument()
    expect(within(help).getByText('Rectangle')).toBeInTheDocument()
    await user.keyboard('r')
    expect(getState().activeTool.id).toBe('react-paint-selection')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(drawCanvas)

    // the menu opens it too, and tells its key
    await user.click(view.getByRole('button', { name: 'Menu' }))
    const helpItem = await view.findByRole('menuitem', { name: 'Keyboard shortcuts' })
    expect(helpItem).toHaveAttribute('aria-keyshortcuts', '?')
    await user.click(helpItem)
    await view.findByRole('dialog', { name: 'Keyboard shortcuts' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument())

    // =====================================================================
    // Ctrl+S saves, Ctrl+O opens, Ctrl+Shift+E exports
    // =====================================================================

    drawCanvas.focus()
    const exportData = spyOn(getPaint().actions, 'exportData').mockImplementation(() => undefined)
    await user.keyboard('{Control>}s{/Control}')
    expect(exportData).toHaveBeenCalledTimes(1)
    exportData.mockRestore()

    const chooseFile = spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined)
    await user.keyboard('{Control>}o{/Control}')
    expect(chooseFile).toHaveBeenCalledTimes(1)
    expect((chooseFile.mock.contexts[0] as HTMLInputElement).accept).toBe('application/JSON')
    chooseFile.mockRestore()

    await user.keyboard('{Control>}{Shift>}E{/Shift}{/Control}')
    await view.findByRole('dialog', { name: 'Choose export settings' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument())

    // =====================================================================
    // The items of the context menu show their shortcut
    // =====================================================================

    drawCanvas.focus()
    const [squareId] = getRootIds().filter(id => id !== textId)
    getPaint().actions.selectShapes([squareId!])
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: toClientX(300), y: toClientY(300) } })
    const copyItem = await view.findByRole('menuitem', { name: 'Copy' })
    expect(copyItem).toHaveAttribute('aria-keyshortcuts', isMac ? 'Meta+C' : 'Control+C')
    expect(copyItem).toHaveTextContent(isMac ? '⌘C' : 'Ctrl+C')
    expect(await view.findByRole('menuitem', { name: 'Duplicate' })).toHaveAttribute('aria-keyshortcuts', isMac ? 'Meta+D' : 'Control+D')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('menu')).not.toBeInTheDocument())
  }
}

export const PasteFromSystem: Story = {
  args: {
    shapes: [SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    const [squareId] = getRootIds() as [string]

    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    expect(getState().selectedShapeIds).toEqual([squareId])

    // --- A copy of shapes marks the clipboard of the system: its paste pastes the shapes ---
    const { clipboardData } = dispatchClipboard('copy')
    expect(clipboardData.types).toContain('application/x-react-paint-shapes')
    dispatchClipboard('paste', clipboardData)
    expect(getRootIds()).toHaveLength(2)
    // the paste is a step of the history
    getPaint().actions.undo()
    expect(getRootIds()).toEqual([squareId])
    getPaint().actions.redo()
    expect(getRootIds()).toHaveLength(2)
    expect(getPaint().getShape(getRootIds()[0]!)?.type).toBe('square')

    // --- A text copied elsewhere since becomes a text, centered in the view and selected, in one step of the history ---
    const text = new DataTransfer()
    text.setData('text/plain', 'Bonjour\nle monde\n')
    const { event } = dispatchClipboard('paste', text)
    expect(event.defaultPrevented).toBe(true)
    const [textId] = getRootIds()
    const pasted = getPaint().getShape(textId!)
    expect(pasted).toMatchObject({ type: 'text', value: ['Bonjour', 'le monde'] })
    expect(getState().selectedShapeIds).toEqual([textId])
    const bounds = getPaint().getBounds([textId!])!
    expect(bounds.center[0]).toBeCloseTo(500, 0)
    expect(bounds.center[1]).toBeCloseTo(300, 0)
    getPaint().actions.undo()
    expect(getRootIds()).toHaveLength(2)

    // --- An image becomes a picture at the center of the view ---
    const image = new DataTransfer()
    image.items.add(new File([SVG_CONTENT], 'image.svg', { type: 'image/svg+xml' }))
    dispatchClipboard('paste', image)
    // the image is loaded first
    await waitFor(() => expect(getRootIds()).toHaveLength(3))
    const picture = getPaint().getShape(getRootIds()[0]!) as { type: string; x: number; y: number; width: number; height: number }
    expect(picture.type).toBe('picture')
    expect(picture.x + picture.width / 2).toBeCloseTo(500, 0)
    expect(picture.y + picture.height / 2).toBeCloseTo(300, 0)

    // --- Nothing from the system: the shapes copied are pasted ---
    getPaint().actions.selectShapes([squareId])
    dispatchClipboard('copy')
    dispatchClipboard('paste')
    expect(getRootIds()).toHaveLength(4)
  }
}
