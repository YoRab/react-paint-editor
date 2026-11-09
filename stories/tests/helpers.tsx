import { useEffect } from 'react'
import { expect, userEvent, type within } from 'storybook/test'
import {
  Canvas,
  type CanvasOptions,
  DEFAULT_EDITOR_LOCALE,
  Editor,
  type EditorOptions,
  type Point,
  type ReactPaint,
  type ShapeEntity,
  type ShapeInput,
  type StateData,
  type ToolsType,
  type UseReactPaintProps,
  useReactPaint
} from '../../src/index'

// ─── Component wrapper ─────────────────────────────────────────────────────────

export const getCurrentDataRef = { current: null as null | (() => StateData) }

/** Handle of the last rendered harness, driven by the tests */
export const paintRef = { current: null as ReactPaint | null }

export const getPaint = () => {
  if (!paintRef.current) throw new Error('The harness is not rendered')
  return paintRef.current
}

export const getState = () => getPaint().getState()

/** A filled square 100 wide, at x and y */
export const square = (id: string, x: number, y: number): ShapeInput => ({
  type: 'rect',
  id,
  x,
  y,
  width: 100,
  height: 100,
  style: { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }
})

const getIds = (shapes: readonly ShapeEntity[]) => shapes.map(shape => shape.id)

/** Ids of the shapes of the drawing, the groups without their shapes */
export const getRootIds = () => getIds(getState().shapes)

export const getSelectedIds = () => getState().selectedShapeIds

/** Ids of the shapes of a group */
export const getChildIds = (id: string) => getIds((getPaint().getShape(id) as ShapeEntity<'group'>).shapes)

export const wait = (ms = 50) => new Promise(res => setTimeout(res, ms))

/** Log of the selectionChanged / toolChanged events emitted by the last rendered wrapper */
export const eventsLog: ({ name: 'selectionChanged'; ids: string[] } | { name: 'toolChanged'; toolId: string })[] = []

/** Events of the state logged in stateEventsLog, with their first argument */
const STATE_EVENT_NAMES = [
  'dataChanged',
  'shapesChanged',
  'viewChanged',
  'gridChanged',
  'toolsChanged',
  'historyChanged',
  'clipboardChanged',
  'contextMenuChanged',
  'optionsChanged'
] as const

export type StateEventName = (typeof STATE_EVENT_NAMES)[number]

/** Log of the events of the state emitted by the last rendered wrapper */
export const stateEventsLog: { name: StateEventName; value: unknown }[] = []

/** The values given to an event of the state, in the log */
export const getLoggedValues = (name: StateEventName) => stateEventsLog.filter(event => event.name === name).map(event => event.value)

export const ReactPaintWrapper = ({
  editorOptions,
  canvasOptions,
  ...args
}: UseReactPaintProps & { editorOptions?: EditorOptions; canvasOptions?: CanvasOptions }) => {
  const paint = useReactPaint(args)
  paintRef.current = paint
  getCurrentDataRef.current = paint.getCurrentData

  useEffect(() => {
    const unregisterSelection = paint.registerEvent('selectionChanged', (shapes: ShapeEntity[]) =>
      eventsLog.push({ name: 'selectionChanged', ids: shapes.map(shape => shape.id) })
    )
    const unregisterTool = paint.registerEvent('toolChanged', (tool: ToolsType) => eventsLog.push({ name: 'toolChanged', toolId: tool.id }))
    const unregisterStates = STATE_EVENT_NAMES.map(name => paint.registerEvent(name, (value: unknown) => stateEventsLog.push({ name, value })))
    return () => {
      unregisterSelection()
      unregisterTool()
      for (const unregister of unregisterStates) unregister()
    }
  }, [paint])

  return (
    <Editor paint={paint} options={editorOptions}>
      <Canvas paint={paint} options={canvasOptions} />
    </Editor>
  )
}

// ─── Canvas coordinate converters ─────────────────────────────────────────────

/** Creates toClientX / toClientY converters from a canvas DOMRect (logical size 1000×600).
 *  Accounts for CSS scaling so that logical canvas coordinates map to correct client pixels. */
export function makeCoordConverters(rect: DOMRect) {
  return {
    toClientX: (canvasX: number) => rect.left + (canvasX * rect.width) / 1000,
    toClientY: (canvasY: number) => rect.top + (canvasY * rect.height) / 600
  }
}

// ─── Tool selection ────────────────────────────────────────────────────────────

// Some tools are grouped inside ToolbarGroup panels.
const { groups } = DEFAULT_EDITOR_LOCALE.editor.toolbar
const TOOL_GROUPS: Record<string, string> = {
  line: groups.lines,
  curve: groups.lines,
  polygon: groups.lines,
  rect: groups.shapes,
  square: groups.shapes,
  circle: groups.shapes,
  ellipse: groups.shapes,
  custom: groups.shapes,
  picture: groups.stickers
}

export async function selectTool(view: ReturnType<typeof within>, toolId: string) {
  let toolButton = view.queryByTestId(`tool-${toolId}`)

  if (!toolButton) {
    // Case 1: toolbar too narrow — "Toggle tools" button is shown
    const toggleBtn = view.queryByRole('button', { name: 'Toggle tools' })
    if (toggleBtn) {
      await userEvent.click(toggleBtn)
    } else {
      // Case 2: tool is inside a group panel — open the group first
      const groupTitle = TOOL_GROUPS[toolId]
      if (groupTitle) {
        const groupBtn = await view.findByRole('button', { name: groupTitle })
        await userEvent.click(groupBtn)
      }
    }
    toolButton = await view.findByTestId(`tool-${toolId}`)
  }

  await userEvent.click(toolButton)
}

// ─── Assertion helpers ─────────────────────────────────────────────────────────

/** An exported shape keeps its id, but none of the data computed by the canvas */
export function assertNoInternalFields(shape: unknown) {
  expect(shape).toHaveProperty('id', expect.any(String))
  expect(shape).not.toHaveProperty('path')
  expect(shape).not.toHaveProperty('computed')
  expect(shape).not.toHaveProperty('selection')
}

/** Position in the page of a point of the drawing */
export const toClient = (point: Point) => getPaint().toClientPosition(point)!

/** Dispatches an event of a pointer at a position in the page: the pointer 1 is the primary one */
export const dispatchPointer = (
  target: EventTarget,
  type: string,
  pointerType: 'mouse' | 'touch',
  pointerId: number,
  { x, y }: { x: number; y: number }
) => {
  target.dispatchEvent(
    new PointerEvent(type, { pointerId, pointerType, isPrimary: pointerId === 1, clientX: x, clientY: y, bubbles: true, cancelable: true })
  )
}

/**
 * Dispatches an event of a finger at a position in the page. The fingers of a pinch are given as events: user-event
 * releases only one of them
 */
export const dispatchTouch = (target: EventTarget, type: string, pointerId: number, position: { x: number; y: number }) =>
  dispatchPointer(target, type, 'touch', pointerId, position)

/** Color of the pixel of the draw canvas at a point of the drawing */
export const getPixel = (drawCanvas: HTMLCanvasElement, point: Point) => {
  const position = toClient(point)
  const rect = drawCanvas.getBoundingClientRect()
  const x = Math.round(((position.x - rect.left) * drawCanvas.width) / rect.width)
  const y = Math.round(((position.y - rect.top) * drawCanvas.height) / rect.height)
  return [...drawCanvas.getContext('2d')!.getImageData(x, y, 1, 1).data]
}

/** The input of a button opening a file chooser, found by the title of the button: the files are given to it */
export const findFileInput = async (view: ReturnType<typeof within>, title: string) =>
  // the title of the button may end with its shortcut: 'Load project (Ctrl+O)'
  (await view.findByTitle((content: string) => content === title || content.startsWith(`${title} (`))).nextElementSibling as HTMLInputElement

// ─── Settings panel helpers ────────────────────────────────────────────────────

async function openSettingPanel(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

async function closeSettingPanel(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

/** Selects a color in a ColorField panel, by its value: its button is named after it in the locale */
export async function setColorSetting(view: ReturnType<typeof within>, title: string, color: string) {
  await openSettingPanel(view, title)
  await userEvent.click(await view.findByRole('button', { name: DEFAULT_EDITOR_LOCALE.editor.settings.colorNames[color] ?? color }))
  await closeSettingPanel(view, title)
}

/** Sets the value of an input with the native setter, which React sees on the next 'input' or 'change' event */
export const setInputValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, value)
}

/** Changes a range slider value via native setter (Playwright-safe). */
export async function setRangeSetting(view: ReturnType<typeof within>, title: string, targetValue: number) {
  await openSettingPanel(view, title)
  const slider = (await view.findByRole('slider')) as HTMLInputElement
  setInputValue(slider, String(targetValue))
  slider.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise(res => setTimeout(res, 0))
  await closeSettingPanel(view, title)
}

/** Types a number in a NumberField panel, the keys going to its field. */
export async function setNumberSetting(view: ReturnType<typeof within>, title: string, value: number) {
  await openSettingPanel(view, title)
  const input = await view.findByRole('spinbutton', { name: title })
  await userEvent.clear(input)
  await userEvent.type(input, String(value))
  await closeSettingPanel(view, title)
}

/** Selects an option in a SelectField panel (pass the option's accessible name). */
export async function setSelectSetting(view: ReturnType<typeof within>, title: string, optionName: string) {
  await openSettingPanel(view, title)
  await userEvent.click(await view.findByRole('button', { name: optionName }))
  await closeSettingPanel(view, title)
}

export const MORE_OPTIONS = 'More options'

/** Changes settings of the panel of the other options, opened then closed. */
export async function inMoreOptions(view: ReturnType<typeof within>, change: () => Promise<void>) {
  await openSettingPanel(view, MORE_OPTIONS)
  await change()
  await closeSettingPanel(view, MORE_OPTIONS)
}

/** Changes a range slider of the panel of the other options, opened then closed. */
export async function setAdvancedRangeSetting(view: ReturnType<typeof within>, title: string, targetValue: number) {
  await inMoreOptions(view, () => setRangeSetting(view, title, targetValue))
}

/** Toggles a ToggleField button (e.g. fontBold / fontItalic). */
export async function setToggleSetting(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

// ─── Picture helper ─────────────────────────────────────────────────────────────

// A small inline SVG used as a data-URI for the URL picture tests.
// An image data URL is loaded as it is, without a fetch. The URL is stored as
// shape.src, and exported as it is.
export const SVG_DATA_URI =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='blue'/></svg>"

/** Adds a picture from its URL through the menu (needs the withUrlPicture option), then waits for it to be loaded and selected. */
export async function addPictureFromUrl(view: ReturnType<typeof within>, src: string) {
  await userEvent.click(await view.findByTitle('Menu'))
  await userEvent.click(await view.findByRole('menuitem', { name: 'Add picture from URL' }))
  const urlInput = await view.findByRole('textbox')
  await userEvent.clear(urlInput)
  await userEvent.type(urlInput, src)
  await userEvent.click(await view.findByRole('button', { name: 'Add' }))
  await new Promise(res => setTimeout(res, 500))
}

// ─── Text helper ────────────────────────────────────────────────────────────────

/** Creates a text with the text tool at a client position of the draw canvas, and returns its edition box, opened by a second click */
export async function openNewTextBox(
  view: ReturnType<typeof within>,
  user: ReturnType<typeof userEvent.setup>,
  drawCanvas: HTMLElement,
  x: number,
  y: number
) {
  await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x, y } })
  await wait()
  await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x, y } })
  await wait(100)
  return view.findByRole('textbox')
}

// ─── Context menu helper ────────────────────────────────────────────────────────

/** Right-clicks at (clientX, clientY) on the draw canvas to open the context menu, then clicks the named menu item. */
export async function openContextMenuAndClick(
  user: ReturnType<typeof userEvent.setup>,
  drawCanvas: HTMLElement,
  view: ReturnType<typeof within>,
  clientX: number,
  clientY: number,
  itemName: string
) {
  await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: clientX, y: clientY } })
  await new Promise(res => setTimeout(res, 100))
  await userEvent.click(await view.findByRole('menuitem', { name: itemName }))
  await new Promise(res => setTimeout(res, 100))
}
