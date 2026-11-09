import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { getPaint, getRootIds, getSelectedIds, getState, ReactPaintWrapper, square, wait } from './../helpers'

const meta = {
  title: 'Tests/Accessibility/LayersAndMinimap',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The layers are gone round with the arrows, selected with Enter, reordered with Alt and the arrows, renamed with F2 and
 * removed with Delete, without the shortcuts of the canvas
 */
export const LayersKeyboard: Story = {
  args: {
    shapes: [square('a', 100, 100), square('b', 300, 100), { ...square('c', 500, 100), name: 'Logo' }]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    const layersButton = await view.findByRole('button', { name: 'Toggle layers panel' })
    await user.click(layersButton)
    expect(layersButton).toHaveAttribute('aria-expanded', 'true')

    const list = await view.findByRole('list', { name: 'Layers' })
    const getButtons = () => within(list).getAllByRole('button', { name: /^(Rectangle \d|Logo|Front)$/ })
    // the default names are numbered from the background, a named shape shows its name
    expect(getButtons().map(button => button.textContent)).toEqual(['Rectangle 2', 'Rectangle 1', 'Logo'])

    // --- the arrows move the focus, Enter selects the shape ---
    getButtons()[0]!.focus()
    await user.keyboard('{ArrowDown}')
    expect(getButtons()[1]).toHaveFocus()
    await user.keyboard('{End}')
    expect(getButtons()[2]).toHaveFocus()
    await user.keyboard('{Home}')
    expect(getButtons()[0]).toHaveFocus()
    // the arrows go round the layers
    await user.keyboard('{ArrowUp}')
    expect(getButtons()[2]).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(getButtons()[0]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(getSelectedIds()).toEqual(['a'])
    expect(getButtons()[0]).toHaveAttribute('aria-pressed', 'true')
    // the arrows of the layers do not move the selected shape
    expect(getPaint().getShape('a')).toMatchObject({ x: 100, y: 100 })

    // --- Alt and the arrows move the shape in the order of the drawing, the focus following its layer ---
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(getRootIds()).toEqual(['b', 'a', 'c'])
    await wait()
    expect(document.activeElement).toBe(getButtons()[1])
    expect(document.activeElement?.closest('[data-layer-id]')).toHaveAttribute('data-layer-id', 'a')

    // --- F2 renames the shape: a, now behind b, keeps its number ---
    await user.keyboard('{F2}')
    const field = view.getByRole('textbox', { name: 'Layer name' })
    expect(field).toHaveValue('Rectangle 2')
    await user.clear(field)
    await user.type(field, 'Front{Enter}')
    expect(getPaint().getShape('a')?.name).toBe('Front')
    await wait()
    expect(document.activeElement).toHaveTextContent('Front')

    // --- Delete removes the shape of the layer, the focus going to the next layer ---
    await user.keyboard('{Delete}')
    expect(getRootIds()).toEqual(['b', 'c'])
    await wait()
    expect(document.activeElement).toHaveTextContent('Logo')
  }
}

/**
 * The buttons of a layer, and Alt with Home and End, move its shape without a drag, among the shapes of its group: the new
 * place is announced
 */
export const LayersMoveButtons: Story = {
  args: {
    shapes: [square('a', 100, 100), square('b', 300, 100), { ...square('c', 500, 100), name: 'Logo' }]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    await user.click(await view.findByRole('button', { name: 'Toggle layers panel' }))

    const list = await view.findByRole('list', { name: 'Layers' })
    const getRow = (id: string) => list.querySelector<HTMLElement>(`.react-paint-editor-layout[data-layer-id="${id}"]`)!
    const getLayerButton = (id: string) => getRow(id).querySelector<HTMLElement>('.react-paint-editor-layout-select')!
    const getMoveButton = (id: string, name: 'Bring forward' | 'Send backward') => within(getRow(id)).getByRole('button', { name })
    const status = canvasElement.querySelector<HTMLElement>('.react-paint-editor-layouts-panel [role="status"]')!

    // the first shape cannot go forward, the last one cannot go backward
    expect(getMoveButton('a', 'Bring forward')).toBeDisabled()
    expect(getMoveButton('a', 'Send backward')).toBeEnabled()
    expect(getMoveButton('c', 'Send backward')).toBeDisabled()
    expect(status).toHaveTextContent('')

    // --- a button moves the shape without selecting it, and keeps the focus ---
    await user.click(getMoveButton('a', 'Send backward'))
    expect(getRootIds()).toEqual(['b', 'a', 'c'])
    expect(getSelectedIds()).toEqual([])
    expect(status.textContent).toBe('Rectangle 2: position 2 of 3')
    await wait()
    expect(getMoveButton('a', 'Send backward')).toHaveFocus()

    // the button disabled at the end of the group gives the focus to its layer
    await user.click(getMoveButton('a', 'Send backward'))
    expect(getRootIds()).toEqual(['b', 'c', 'a'])
    expect(status.textContent).toBe('Rectangle 2: position 3 of 3')
    await wait()
    expect(getMoveButton('a', 'Send backward')).toBeDisabled()
    expect(getLayerButton('a')).toHaveFocus()

    // --- Alt and Home or End put the shape first or last ---
    await user.keyboard('{Alt>}{Home}{/Alt}')
    expect(getRootIds()).toEqual(['a', 'b', 'c'])
    expect(status.textContent).toBe('Rectangle 2: position 1 of 3')
    await wait()
    expect(getLayerButton('a')).toHaveFocus()
    await user.keyboard('{Alt>}{End}{/Alt}')
    expect(getRootIds()).toEqual(['b', 'c', 'a'])
    expect(status.textContent).toBe('Rectangle 2: position 3 of 3')
    // the same place is announced again
    await wait()
    await user.keyboard('{Alt>}{End}{/Alt}')
    expect(getRootIds()).toEqual(['b', 'c', 'a'])
    expect(status.textContent).toBe('Rectangle 2: position 3 of 3 ')
    // Home alone still goes to the first layer
    await wait()
    await user.keyboard('{Home}')
    expect(getLayerButton('b')).toHaveFocus()
    expect(getRootIds()).toEqual(['b', 'c', 'a'])

    // --- the shapes moved keep their names, a new shape takes the next number ---
    expect([...list.querySelectorAll('.react-paint-editor-layout-select')].map(button => button.textContent)).toEqual([
      'Rectangle 1',
      'Logo',
      'Rectangle 2'
    ])
    getPaint().actions.addShapes([square('d', 700, 100)])
    await waitFor(() => expect(getLayerButton('d')).toHaveTextContent('Rectangle 3'))
  }
}

/** The minimap takes the focus, and its arrows move the view */
export const MinimapKeyboard: Story = {
  args: {
    shapes: [square('a', 100, 100), square('b', 1500, 900)],
    options: { size: 'infinite' }
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    await view.findByTestId('draw-canvas')
    const minimap = await view.findByLabelText('Minimap')
    expect(minimap).toHaveAttribute('tabindex', '0')

    getPaint().actions.selectShapes(['a'])
    minimap.focus()
    const { visibleArea } = getState().view
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(getState().view.visibleArea.x).toBeCloseTo(visibleArea.x + visibleArea.width * 0.1, 3))
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(getState().view.visibleArea.y).toBeCloseTo(visibleArea.y + visibleArea.height * 0.5, 3)
    // the arrows of the minimap do not move the selected shape
    expect(getPaint().getShape('a')).toMatchObject({ x: 100, y: 100 })
  }
}
