import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
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

/** The surface which a button controls */
const getControlled = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls') ?? '')

/** The elements of the surface which Tab goes through */
const getTabStops = (element: HTMLElement) => [...element.querySelectorAll<HTMLElement>('button, [tabindex]')].filter(item => item.tabIndex === 0)

/**
 * The menus and the panels of the tools are used alike: their button opens and closes them, the focus goes inside on the
 * value chosen, the arrows, Home and End go round their items, which take a single stop of Tab, Escape and Tab leaving
 * them close them, and the item chosen closes them, the focus going back to their button
 */
export const PopupsKeyboard: Story = {
  args: {
    shapes: [square('a', 100, 100)]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    await wait(100)

    // =====================================================================
    // A group of tools: the focus goes to its active tool, the arrows go round the tools
    // =====================================================================

    const groupButton = view.getByRole('button', { name: 'Shapes' })
    groupButton.focus()
    await user.keyboard('{Enter}')
    expect(groupButton).toHaveAttribute('aria-expanded', 'true')
    const panel = getControlled(groupButton)!
    expect(panel).toBeInTheDocument()
    const tools = within(panel).getAllByRole('button')
    await waitFor(() => expect(view.getByTestId('tool-rect')).toHaveFocus())
    expect(getTabStops(panel)).toEqual([view.getByTestId('tool-rect')])
    await user.keyboard('{ArrowRight}')
    expect(tools[1]).toHaveFocus()
    await user.keyboard('{Home}{ArrowLeft}')
    expect(tools.at(-1)).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(tools[0]).toHaveFocus()

    // --- the tool chosen closes the panel, the focus going back to its button ---
    await user.keyboard('{ArrowDown}{Enter}')
    expect(getState().activeTool.type).toBe('square')
    await waitFor(() => expect(groupButton).toHaveAttribute('aria-expanded', 'false'))
    expect(groupButton).toHaveFocus()

    // --- opened again, the focus goes to the tool chosen, Tab leaving the panel closes it ---
    await user.keyboard('{Enter}')
    await waitFor(() => expect(view.getByTestId('tool-square')).toHaveFocus())
    await user.tab()
    await waitFor(() => expect(groupButton).toHaveAttribute('aria-expanded', 'false'))

    // --- Escape closes it, the focus going back to its button ---
    groupButton.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(view.getByTestId('tool-square')).toHaveFocus())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(groupButton).toHaveAttribute('aria-expanded', 'false'))
    expect(groupButton).toHaveFocus()

    // --- the button opens and closes the panel ---
    await user.click(groupButton)
    expect(groupButton).toHaveAttribute('aria-expanded', 'true')
    await user.click(groupButton)
    expect(groupButton).toHaveAttribute('aria-expanded', 'false')

    // =====================================================================
    // The menu: its items take a single stop of Tab, its button opens and closes it, Tab closes it
    // =====================================================================

    const menuButton = view.getByRole('button', { name: 'Menu' })
    await user.click(menuButton)
    const menu = await view.findByRole('menu', { name: 'Menu' })
    expect(getControlled(menuButton)).toBe(menu)
    await waitFor(() => expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus())
    expect(getTabStops(menu)).toHaveLength(1)
    await user.click(menuButton)
    await waitFor(() => expect(view.queryByRole('menu')).toBeNull())

    menuButton.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(within(view.getByRole('menu')).getAllByRole('menuitem')[0]).toHaveFocus())
    await user.tab()
    await waitFor(() => expect(view.queryByRole('menu')).toBeNull())
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    // =====================================================================
    // A panel of the settings: the focus goes to the value chosen, the arrows go round the values, a value chosen
    // keeps the panel open, Tab leaving it closes it
    // =====================================================================

    await user.click(view.getByTestId('tool-selection'))
    getPaint().actions.selectShapes(['a'])
    const lineTypeButton = await view.findByRole('button', { name: 'Stroke type' })
    lineTypeButton.focus()
    await user.keyboard('{Enter}')
    const lineTypes = view.getByRole('group', { name: 'Stroke type' })
    const options = within(lineTypes).getAllByRole('button')
    // no value is chosen yet: the first one takes the focus
    await waitFor(() => expect(options[0]).toHaveFocus())
    await user.keyboard('{End}')
    expect(options.at(-1)).toHaveFocus()
    expect(getTabStops(lineTypes)).toEqual([options.at(-1)])
    await user.keyboard('{Enter}')
    expect(options.at(-1)).toHaveAttribute('aria-pressed', 'true')
    expect(view.getByRole('group', { name: 'Stroke type' })).toBeInTheDocument()
    // the arrows of the panel do not move the selected shape
    expect(getPaint().getShape('a')).toMatchObject({ x: 100, y: 100 })
    await user.tab()
    await waitFor(() => expect(view.queryByRole('group', { name: 'Stroke type' })).toBeNull())

    // --- opened again, the focus goes to the value chosen ---
    lineTypeButton.focus()
    await user.keyboard('{Enter}')
    const chosen = within(view.getByRole('group', { name: 'Stroke type' })).getByRole('button', { pressed: true })
    await waitFor(() => expect(chosen).toHaveFocus())
    expect(chosen).toHaveAccessibleName('Dashes and dots')
    await user.keyboard('{Escape}')
    expect(lineTypeButton).toHaveFocus()
  }
}

/**
 * The panels of the zoom and of the layers stay open: their button opens them with the focus inside, Escape gives the
 * focus back to their button. Their groups of buttons take a single stop of Tab, gone through with the arrows
 */
export const PanelsKeyboard: Story = {
  args: {
    shapes: [square('a', 100, 100), { type: 'group', id: 'g', shapes: [square('g1', 300, 100), square('g2', 450, 100)] }, square('c', 600, 100)],
    options: { size: 'infinite' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    await wait(100)

    // =====================================================================
    // The zoom panel, shown at first without the focus
    // =====================================================================

    const zoomButton = view.getByRole('button', { name: 'Toggle zoom panel' })
    const zoomPanel = getControlled(zoomButton)!
    expect(zoomPanel).toBeInTheDocument()
    expect(zoomPanel).not.toContainElement(document.activeElement as HTMLElement)

    // --- its button closes it, and opens it again with the focus on its buttons ---
    zoomButton.focus()
    await user.keyboard('{Enter}')
    expect(zoomButton).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{Enter}')
    const zoomOut = await view.findByRole('button', { name: 'Zoom out' })
    await waitFor(() => expect(zoomOut).toHaveFocus())
    await user.keyboard('{ArrowRight}')
    expect(view.getByRole('button', { name: '100%' })).toHaveFocus()
    await user.keyboard('{End}{ArrowRight}')
    expect(zoomOut).toHaveFocus()

    // --- the minimap is the next stop of Tab, Escape gives the focus back to the button of the panel, still open ---
    await user.tab()
    expect(view.getByLabelText('Minimap')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(zoomButton).toHaveFocus()
    expect(zoomButton).toHaveAttribute('aria-expanded', 'true')

    // --- a button disabled at the limit of the zoom gives the focus to its neighbour ---
    getPaint().actions.zoomTo(0.1)
    zoomOut.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(zoomOut).toBeDisabled())
    await waitFor(() => expect(view.getByRole('button', { name: '5%' })).toHaveFocus())

    // =====================================================================
    // The layers panel
    // =====================================================================

    const layersButton = view.getByRole('button', { name: 'Toggle layers panel' })
    layersButton.focus()
    await user.keyboard('{Enter}')
    expect(layersButton).toHaveAttribute('aria-expanded', 'true')
    const layersPanel = getControlled(layersButton)!
    // the focus goes to the grid chosen
    await waitFor(() => expect(within(layersPanel).getByRole('button', { name: 'No grid' })).toHaveFocus())

    // --- a single layer takes Tab, with its buttons ---
    const list = within(layersPanel).getByRole('list', { name: 'Layers' })
    const getNames = () => within(list).getAllByRole('button', { name: /^(Rectangle \d|Group \d)$/ })
    const stops = getTabStops(list)
    expect(stops.map(stop => stop.getAttribute('title') ?? stop.textContent)).toEqual([
      'Rectangle 4',
      'Bring forward',
      'Send backward',
      'Hide',
      'Lock',
      'Delete'
    ])
    await user.tab()
    expect(getNames()[0]).toHaveFocus()
    // the first layer cannot move forward: its disabled button is left out
    await user.tab()
    expect(within(list).getAllByRole('button', { name: 'Send backward' })[0]).toHaveFocus()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(within(list).getAllByRole('button', { name: 'Delete' })[0]).toHaveFocus()
    await user.tab()
    expect(list).not.toContainElement(document.activeElement as HTMLElement)

    // --- the arrows go round the layers, ArrowLeft and ArrowRight collapse and expand a group ---
    getNames()[0]!.focus()
    await user.keyboard('{ArrowUp}')
    expect(getNames().at(-1)).toHaveFocus()
    await user.keyboard('{Home}{ArrowDown}')
    const group = getNames()[1]!
    expect(group).toHaveTextContent('Group 1')
    expect(group).toHaveFocus()
    expect(getNames()).toHaveLength(5)
    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(getNames()).toHaveLength(3))
    expect(within(list).getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toHaveTextContent('Group 1')
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(getNames()).toHaveLength(5))
    // the arrows of the layers do not change the selection
    expect(getSelectedIds()).toEqual([])

    // --- Escape in the field of a name cancels it, the focus staying on the layer ---
    await user.keyboard('{F2}')
    const field = view.getByRole('textbox', { name: 'Layer name' })
    await user.clear(field)
    await user.type(field, 'Nouveau')
    await user.keyboard('{Escape}')
    expect(getPaint().getShape('g')?.name).toBeUndefined()
    await wait()
    expect(document.activeElement).toHaveTextContent('Group 1')

    // --- Escape in the panel gives the focus back to its button, the panel staying open ---
    await user.keyboard('{Escape}')
    expect(layersButton).toHaveFocus()
    expect(layersButton).toHaveAttribute('aria-expanded', 'true')
    expect(getControlled(layersButton)).toBe(layersPanel)
  }
}
