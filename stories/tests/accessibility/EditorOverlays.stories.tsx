import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { findFileInput, getPaint, getSelectedIds, getState, ReactPaintWrapper, square, wait } from './../helpers'

const meta = {
  title: 'Tests/Accessibility',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/** The live region of the editor, which the assistive technologies read */
const getAnnouncement = (canvasElement: HTMLElement) => canvasElement.querySelector('.react-paint-editor-sr-only')?.textContent?.trim()

/**
 * The states of the buttons of the editor are given to the assistive technologies, and its panels, menus and modals are
 * used from the keyboard: they take the focus, Escape closes them, and the focus goes back to their button
 */
export const EditorOverlays: Story = {
  args: {
    shapes: [square('a', 100, 100), square('b', 400, 100)]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    await wait(100)

    // =====================================================================
    // The active tool is pressed
    // =====================================================================

    expect(view.getByTestId('tool-selection')).toHaveAttribute('aria-pressed', 'true')
    const rectTool = getState().tools.find(tool => tool.type === 'rect')!
    getPaint().actions.selectTool(rectTool.id)
    await wait()
    expect(view.getByTestId('tool-selection')).toHaveAttribute('aria-pressed', 'false')
    // the change is announced
    await waitFor(() => expect(getAnnouncement(canvasElement)).toBe('Outil Rectangle'))

    // =====================================================================
    // A field opens its panel: the button tells it, Escape closes it and gives the focus back to the button
    // =====================================================================

    getPaint().actions.selectShapes(['a'])
    await waitFor(() => expect(getAnnouncement(canvasElement)).toContain('Sélection : Rectangle 2'))
    const strokeButton = await view.findByRole('button', { name: 'Couleur du trait' })
    expect(strokeButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(strokeButton)
    expect(strokeButton).toHaveAttribute('aria-expanded', 'true')
    const panel = view.getByRole('group', { name: 'Couleur du trait' })
    expect(panel.id).toBe(strokeButton.getAttribute('aria-controls'))
    // the colors tell the one chosen
    expect(within(panel).getAllByRole('button', { pressed: true })).toHaveLength(1)
    within(panel).getAllByRole('button')[0]!.focus()
    await user.keyboard('{Escape}')
    expect(view.queryByRole('group', { name: 'Couleur du trait' })).toBeNull()
    expect(strokeButton).toHaveFocus()
    // Escape in the panel does not change the selection
    expect(getSelectedIds()).toEqual(['a'])

    // the slider is named by its field, and tells its value
    await user.click(view.getByRole('button', { name: 'Opacité' }))
    const slider = view.getByRole('slider', { name: 'Opacité' })
    expect(slider).toHaveAttribute('aria-valuetext', '100%')
    await user.click(view.getByRole('button', { name: 'Opacité' }))

    // =====================================================================
    // The position, the size and the angle of the selection are typed in fields of a modal opened by the context menu
    // =====================================================================

    const drawCanvas = view.getByTestId('draw-canvas')
    // the menu of the keyboard opens once the pointer has been released for a while
    drawCanvas.focus()
    await wait(600)
    drawCanvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await user.click(await view.findByRole('menuitem', { name: 'Propriétés' }))
    const properties = await view.findByRole('dialog', { name: 'Propriétés' })
    const getField = (name: string) => within(properties).getByRole('spinbutton', { name })
    const { x, y, width } = getPaint().getBounds(['a'])!
    expect(getField('X')).toHaveValue(Math.round(x))
    await user.clear(getField('X'))
    await user.type(getField('X'), '300')
    expect(getPaint().getBounds(['a'])).toMatchObject({ x: 300, y })
    await user.clear(getField('Largeur'))
    await user.type(getField('Largeur'), '150')
    expect(getPaint().getBounds(['a'])!.width).toBeCloseTo(150, 0)
    expect(width).not.toBe(150)
    await user.clear(getField('Rotation'))
    await user.type(getField('Rotation'), '90')
    expect(getPaint().getBounds(['a'])!.rotation).toBeCloseTo(Math.PI / 2, 5)
    // like a slider, the fields save their last change only, once they are left
    await wait(600)
    expect(getState().history.canUndo).toBe(true)
    getPaint().actions.undo()
    expect(getPaint().getBounds(['a'])!.rotation).toBe(0)
    await user.click(within(properties).getByRole('button', { name: 'Fermer' }))
    expect(view.queryByRole('dialog')).toBeNull()

    // =====================================================================
    // The menu takes the focus, the arrows go through its items, Escape closes it and gives the focus back to its button
    // =====================================================================

    const menuButton = view.getByRole('button', { name: 'Menu' })
    menuButton.focus()
    await user.keyboard('{Enter}')
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    const menu = await view.findByRole('menu', { name: 'Menu' })
    const items = within(menu).getAllByRole('menuitem')
    expect(items.map(item => item.textContent)).toEqual(['Upload picture', 'Load project', 'Save project', 'Export PNG'])
    await waitFor(() => expect(items[0]).toHaveFocus())
    await user.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(items[3]).toHaveFocus()
    await user.keyboard('{Home}')
    expect(items[0]).toHaveFocus()
    // the arrows of the menu do not move the selection
    expect(getPaint().getBounds(['a'])!.y).toBe(y)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('menu')).toBeNull())
    expect(menuButton).toHaveFocus()

    // =====================================================================
    // A modal takes the focus, keeps it inside with Tab, and gives it back once closed by Escape
    // =====================================================================

    await user.keyboard('{Enter}')
    await user.click(await view.findByRole('menuitem', { name: 'Export PNG' }))
    const modal = await view.findByRole('dialog', { name: 'Choose export settings' })
    const modalButtons = within(modal).getAllByRole('button')
    await waitFor(() => expect(modalButtons[0]).toHaveFocus())
    modalButtons.at(-1)!.focus()
    await user.tab()
    expect(modalButtons[0]).toHaveFocus()
    await user.tab({ shift: true })
    expect(modalButtons.at(-1)).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull())
    // the item of the menu which opened it is gone: the button of the menu takes the focus
    expect(menuButton).toHaveFocus()

    // =====================================================================
    // A message is read from a live region, stays while the pointer is on it, and is closed by its button
    // =====================================================================

    await user.click(menuButton)
    await user.upload(await findFileInput(view, 'Upload picture'), new File(['not an image'], 'broken.png', { type: 'image/png' }))
    const status = canvasElement.querySelector('.react-paint-editor-snackbar-container')!
    expect(status).toHaveAttribute('role', 'status')
    const message = await within(status as HTMLElement).findByText('Le chargement a échoué')
    await user.click(within(message).getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(within(status as HTMLElement).queryByText('Le chargement a échoué')).toBeNull())

    // =====================================================================
    // The shapes removed and the zoom are announced
    // =====================================================================

    getPaint().actions.removeShapes(['b'])
    await waitFor(() => expect(getAnnouncement(canvasElement)).toContain('Suppression : Rectangle'))
    getPaint().actions.zoomTo(2)
    await waitFor(() => expect(getAnnouncement(canvasElement)).toBe('Zoom 200 %'))
  }
}

/** The context menu stays open, for the checks of axe at the end of the story */
export const OpenContextMenu: Story = {
  args: {
    shapes: [square('a', 100, 100)]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    getPaint().actions.selectShapes(['a'])
    drawCanvas.focus()
    drawCanvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    const menu = await view.findByRole('menu', { name: 'Menu contextuel' })
    await userEvent.keyboard('{ArrowRight}')
    expect(await within(menu).findByRole('menu', { name: 'Organize' })).toBeInTheDocument()
  }
}

/** The modal of the export and a panel of the settings stay open, for the checks of axe at the end of the story */
export const OpenModalAndPanel: Story = {
  args: {
    shapes: [square('a', 100, 100)]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    getPaint().actions.selectShapes(['a'])
    await userEvent.click(await view.findByRole('button', { name: 'Type de traits' }))
    expect(view.getByRole('button', { name: 'Tirets' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(view.getByRole('button', { name: 'Menu' }))
    await userEvent.click(await view.findByRole('menuitem', { name: 'Export PNG' }))
    expect(await view.findByRole('dialog', { name: 'Choose export settings' })).toBeInTheDocument()
  }
}
