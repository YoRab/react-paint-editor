import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { cdp } from 'vitest/browser'
import type { DrawableShape } from '../../../src/index'
import { getPaint, getRootIds, getState, makeCoordConverters, ReactPaintWrapper } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: { layout: 'centered' }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

const STYLE = { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }
const A: DrawableShape = { type: 'square', x: 250, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }
const B: DrawableShape = { type: 'square', x: 550, y: 250, width: 100, height: 100, rotation: 0, style: STYLE }

const ALT = 1
const CTRL = 2
const SHIFT = 8

/** A real key event of the browser, as an AZERTY keyboard gives it: returns whether the shortcuts prevented it */
const press = async (key: string, code: string, modifiers = 0, keyCode = 0) => {
  const session = cdp()
  // the tests run in a frame: it has to take the focus of the page for the keys of the browser
  window.focus()
  if (document.activeElement === document.body) (document.querySelector('[data-testid="draw-canvas"]') as HTMLElement).focus()
  const seen: boolean[] = []
  const record = (e: KeyboardEvent) => seen.push(e.defaultPrevented)
  // set after the handlers of the canvas, which stop the event
  const root = (document.querySelector('[data-testid="draw-canvas"]') as HTMLElement).closest('.react-paint-editor-app') as HTMLElement
  root.addEventListener('keydown', record)
  await session.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode
  })
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode })
  root.removeEventListener('keydown', record)
  return seen
}

/**
 * The keys of an AZERTY keyboard, sent as real key events of the browser (Chrome DevTools Protocol): the page would zoom or
 * bookmark if the canvas did not prevent them. Ctrl + 0 gives à, Ctrl + AltGr + ) gives ] (Windows reports Ctrl + Alt), ? is Shift + ,
 */
export const AzertyKeys: Story = {
  args: { shapes: [A, B], options: { canZoom: 'always' } },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const { toClientX, toClientY } = makeCoordConverters(drawCanvas.getBoundingClientRect())
    const user = userEvent.setup()
    const [aId, bId] = getRootIds() as [string, string]
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })

    // Ctrl + '=' (AZERTY: the key gives =), Ctrl + 0 gives à, Ctrl + - is on the 6
    getPaint().actions.zoomTo(2)
    expect(await press('à', 'Digit0', CTRL, 48)).toEqual([true])
    expect(getState().view.zoom).toBe(1)
    expect(await press('=', 'Equal', CTRL, 187)).toEqual([true])
    expect(getState().view.zoom).toBeGreaterThan(1)
    expect(await press('-', 'Digit6', CTRL, 189)).toEqual([true])
    expect(getState().view.zoom).toBe(1)

    // Shift + & gives 1 on AZERTY: Shift is pressed first
    await press('Shift', 'ShiftLeft', SHIFT, 16)
    getPaint().actions.zoomTo(2)
    await cdp().send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Shift', code: 'ShiftLeft', modifiers: SHIFT, windowsVirtualKeyCode: 16 })
    expect(await press('1', 'Digit1', SHIFT, 49)).toEqual([true])
    await cdp().send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', modifiers: 0, windowsVirtualKeyCode: 16 })
    expect(getState().view.zoom).not.toBe(2)
    getPaint().actions.resetZoom()

    // AltGr + ) gives ] and AltGr + ( gives [, with Ctrl: Windows reports Ctrl + Alt
    getPaint().actions.selectShapes([bId])
    expect(await press(']', 'Minus', CTRL | ALT, 221)).toEqual([true])
    expect(getRootIds()).toEqual([bId, aId])
    expect(getState().view.zoom).toBe(1)
    expect(await press('[', 'Digit5', CTRL | ALT, 219)).toEqual([true])
    expect(getRootIds()).toEqual([aId, bId])

    // Ctrl + A is on the Q key
    expect(await press('a', 'KeyQ', CTRL, 65)).toEqual([true])
    expect(getState().selectedShapeIds).toHaveLength(2)

    // ? is Shift + , on AZERTY: it opens the list of the shortcuts
    drawCanvas.focus()
    await press('Shift', 'ShiftLeft', SHIFT, 16)
    expect(await press('?', 'Comma', SHIFT, 188)).toEqual([true])
    await waitFor(() => expect(view.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument())
  }
}
