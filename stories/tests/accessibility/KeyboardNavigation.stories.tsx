import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { ShapeInput } from '../../../src/index'
import { getPaint, getSelectedIds, getState, ReactPaintWrapper, square, wait } from './../helpers'

const meta = {
  title: 'Tests/Accessibility',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// from the foreground: a rectangle, a group of two rectangles, a text
const SHAPES: ShapeInput[] = [
  square('a', 100, 100),
  { type: 'group', id: 'g', shapes: [square('g1', 300, 100), square('g2', 450, 100)] },
  { type: 'text', id: 't', x: 100, y: 350, value: ['Bonjour'], style: { strokeColor: '#000000' } }
]

const getHint = (canvasElement: HTMLElement) => canvasElement.querySelector('.react-paint-canvas-keyboard-hint')

export const KeyboardNavigation: Story = {
  args: {
    shapes: SHAPES,
    options: { canZoom: 'always' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const user = userEvent.setup()
    await wait(100)
    // the hint is hidden until the canvas takes the focus from the keyboard
    expect(getHint(canvasElement)).not.toBeVisible()

    // =====================================================================
    // The canvas is named and described, and its fallback content lists the shapes
    // =====================================================================

    expect(drawCanvas).toHaveAttribute('role', 'application')
    expect(drawCanvas).toHaveAttribute('aria-roledescription', 'zone de dessin')
    expect(drawCanvas).toHaveAccessibleName('Dessin')
    expect(drawCanvas).toHaveAccessibleDescription(/Tab et Maj\+Tab/)
    const list = within(drawCanvas).getByRole('list', { name: 'Formes du dessin' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map(item => item.firstChild?.textContent)
    ).toEqual(['Rectangle', 'Groupe', 'Rectangle', 'Rectangle', 'Texte : Bonjour'])

    // =====================================================================
    // Reached with Tab, the canvas shows a hint: Enter goes through the shapes
    // =====================================================================

    view.getByTitle('Menu').focus()
    await user.tab()
    expect(document.activeElement).toBe(drawCanvas)
    expect(getHint(canvasElement)).toBeVisible()
    expect(getHint(canvasElement)).toHaveTextContent('Déplacer le focus sur le canvas')
    expect(getState().interaction.keyboardNavigation).toBe(false)

    await user.keyboard('{Enter}')
    expect(getState().interaction.keyboardNavigation).toBe(true)
    expect(getHint(canvasElement)).toBeNull()

    // =====================================================================
    // Tab and Shift+Tab go round the shapes of the drawing, the focus stays on the canvas
    // =====================================================================

    await user.tab()
    expect(getSelectedIds()).toEqual(['a'])
    await user.tab()
    expect(getSelectedIds()).toEqual(['g'])
    await user.tab()
    expect(getSelectedIds()).toEqual(['t'])
    await user.tab()
    expect(getSelectedIds()).toEqual(['a'])
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(getSelectedIds()).toEqual(['t'])
    expect(document.activeElement).toBe(drawCanvas)
    // the selected shape is told in the fallback content
    expect(within(list).getByText('Texte : Bonjour, sélectionnée')).toBeInTheDocument()

    // =====================================================================
    // Enter goes inside a group, whose shapes Tab goes round, and Escape goes up to the group
    // =====================================================================

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(getSelectedIds()).toEqual(['g'])
    await user.keyboard('{Enter}')
    expect(getSelectedIds()).toEqual(['g1'])
    await user.tab()
    expect(getSelectedIds()).toEqual(['g2'])
    await user.tab()
    expect(getSelectedIds()).toEqual(['g1'])
    await user.keyboard('{Escape}')
    expect(getSelectedIds()).toEqual(['g'])
    expect(getState().interaction.keyboardNavigation).toBe(true)

    // =====================================================================
    // Enter edits a text, and Escape keeps it selected
    // =====================================================================

    await user.tab()
    expect(getSelectedIds()).toEqual(['t'])
    await user.keyboard('{Enter}')
    expect(await view.findByRole('textbox', { name: 'Texte' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(view.queryByRole('textbox')).toBeNull()
    expect(getSelectedIds()).toEqual(['t'])
    expect(document.activeElement).toBe(drawCanvas)
    expect(getState().interaction.keyboardNavigation).toBe(true)

    // =====================================================================
    // Escape at the top of the drawing clears the selection and leaves the shapes: Tab leaves the canvas again
    // =====================================================================

    await user.keyboard('{Escape}')
    expect(getSelectedIds()).toEqual([])
    expect(getState().interaction.keyboardNavigation).toBe(false)
    expect(getHint(canvasElement)).toBeVisible()
    expect(getHint(canvasElement)).toHaveTextContent('Déplacer le focus sur le canvas')
    await user.tab()
    expect(document.activeElement).not.toBe(drawCanvas)
    expect(getSelectedIds()).toEqual([])

    // =====================================================================
    // With a drawing tool, Enter draws a shape of the default size at the center of the view
    // =====================================================================

    const rectTool = getState().tools.find(tool => tool.type === 'rect')!
    getPaint().actions.selectTool(rectTool.id)
    drawCanvas.focus()
    await user.keyboard('{Enter}{Enter}')
    expect(getState().shapes).toHaveLength(4)
    const [created] = getState().selectedShapes
    expect(created).toMatchObject({ type: 'rect', toolId: rectTool.id })
    const { x, y, width, height } = created as { x: number; y: number; width: number; height: number }
    expect([x + width / 2, y + height / 2]).toEqual([500, 300])
    expect(getState().history.canUndo).toBe(true)

    // the arrows move it by 1, and by 10 with Shift
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(getPaint().getShape(created!.id)).toMatchObject({ x: x + 1, y: y + 10 })

    // =====================================================================
    // Without selection, the arrows move the view
    // =====================================================================

    getPaint().actions.clearSelection()
    getPaint().actions.zoomTo(2)
    const [offsetX, offsetY] = getState().view.offset
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowDown}')
    expect(getState().view.offset).toEqual([offsetX - 25, offsetY - 25])
    getPaint().actions.resetZoom()

    // =====================================================================
    // Shift+F10 opens the context menu on the selection, which takes the focus and goes with the arrows
    // =====================================================================

    getPaint().actions.selectShapes(['a'])
    drawCanvas.focus()
    drawCanvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    const menu = await view.findByRole('menu', { name: 'Menu contextuel' })
    await waitFor(() => expect(within(menu).getByRole('menuitem', { name: 'Organize' })).toHaveFocus())
    expect(getState().contextMenu?.shapes.map(shape => shape.id)).toEqual(['a'])

    await user.keyboard('{ArrowDown}')
    const transform = within(menu).getByRole('menuitem', { name: 'Transform' })
    expect(transform).toHaveFocus()
    // the arrows of the menu do not move the selection
    expect(getPaint().getShape('a')).toMatchObject({ x: 100, y: 100 })

    await user.keyboard('{ArrowRight}')
    expect(transform).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(view.getByRole('menuitem', { name: 'Flip horizontally' })).toHaveFocus())
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(view.queryByRole('menuitem', { name: 'Flip horizontally' })).toBeNull())
    expect(transform).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('menu')).toBeNull())
    expect(document.activeElement).toBe(drawCanvas)
    expect(getSelectedIds()).toEqual(['a'])

    // =====================================================================
    // The properties open a modal of fields: it takes the focus, Tab goes through the fields and Escape closes it
    // =====================================================================

    drawCanvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    const reopenedMenu = await view.findByRole('menu', { name: 'Menu contextuel' })
    await waitFor(() => expect(within(reopenedMenu).getByRole('menuitem', { name: 'Organize' })).toHaveFocus())
    await user.keyboard('{End}{Enter}')
    await waitFor(() => expect(view.queryByRole('menu')).toBeNull())
    const dialog = await view.findByRole('dialog', { name: 'Propriétés' })
    await waitFor(() => expect(within(dialog).getByRole('spinbutton', { name: 'X' })).toHaveFocus())
    await user.keyboard('{Tab}')
    expect(within(dialog).getByRole('spinbutton', { name: 'Y' })).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(drawCanvas)
  }
}
