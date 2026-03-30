import { expect, userEvent, within } from 'storybook/test'
import { Canvas, Editor, type StateData, useReactPaint } from '../../src/index'

// ─── Component wrapper ─────────────────────────────────────────────────────────

export const getCurrentDataRef = { current: null as null | (() => StateData) }

export const ReactPaintWrapper = (args: Parameters<typeof useReactPaint>[0]) => {
  const { editorProps, canvasProps, getCurrentData } = useReactPaint(args)
  getCurrentDataRef.current = getCurrentData

  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
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
const TOOL_GROUPS: Record<string, string> = {
  line: 'lines',
  curve: 'lines',
  polygon: 'lines',
  rect: 'shapes',
  square: 'shapes',
  circle: 'shapes',
  ellipse: 'shapes'
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

export function assertNoInternalFields(shape: unknown) {
  expect(shape).not.toHaveProperty('id')
  expect(shape).not.toHaveProperty('path')
  expect(shape).not.toHaveProperty('computed')
  expect(shape).not.toHaveProperty('selection')
}

// ─── Settings panel helpers ────────────────────────────────────────────────────

async function openSettingPanel(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

async function closeSettingPanel(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

/** Selects a color in a ColorField panel. */
export async function setColorSetting(view: ReturnType<typeof within>, title: string, color: string) {
  await openSettingPanel(view, title)
  await userEvent.click(await view.findByRole('button', { name: color }))
  await closeSettingPanel(view, title)
}

/** Changes a range slider value via native setter (Playwright-safe). */
export async function setRangeSetting(view: ReturnType<typeof within>, title: string, targetValue: number) {
  await openSettingPanel(view, title)
  const slider = (await view.findByRole('slider')) as HTMLInputElement
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  nativeSetter.call(slider, String(targetValue))
  slider.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise(res => setTimeout(res, 0))
  await closeSettingPanel(view, title)
}

/** Selects an option in a SelectField panel (pass the option's accessible name). */
export async function setSelectSetting(view: ReturnType<typeof within>, title: string, optionName: string) {
  await openSettingPanel(view, title)
  await userEvent.click(await view.findByRole('button', { name: optionName }))
  await closeSettingPanel(view, title)
}

/** Toggles a ToggleField button (e.g. fontBold / fontItalic). */
export async function setToggleSetting(view: ReturnType<typeof within>, title: string) {
  await userEvent.click(await view.findByRole('button', { name: title }))
}

// ─── Context menu helper ────────────────────────────────────────────────────────

/**
 * Right-clicks at (clientX, clientY) on the draw canvas to open the context menu,
 * retrying once if it did not appear (canvas may have lost focus after settings
 * interactions), then clicks the named menu item.
 */
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
  if (!view.queryByRole('button', { name: itemName })) {
    // isInsideCanvas may have been false (canvas lost focus during settings); retry once.
    await user.pointer({ target: drawCanvas, keys: '[MouseRight]', coords: { x: clientX, y: clientY } })
    await new Promise(res => setTimeout(res, 100))
  }
  await userEvent.click(await view.findByRole('button', { name: itemName }))
  await new Promise(res => setTimeout(res, 100))
}
