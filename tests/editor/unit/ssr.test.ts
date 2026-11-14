import { Canvas, useReactPaint } from '@canvas/index'
import { Editor } from '@editor/index'
import { act, createElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * @vitest-environment jsdom
 */

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
// jsdom has no ResizeObserver
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
)

const MAC_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'

const App = () => {
  const paint = useReactPaint()
  // biome-ignore lint/correctness/noChildrenProp: the props of Editor require its children, which TypeScript only reads there
  return createElement(Editor, { paint, children: createElement(Canvas, { paint }) })
}

let root: Root | undefined

/** What React wrote with console.error */
const getErrors = () => vi.mocked(console.error).mock.calls

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('server-side rendering of the editor', () => {
  it('renders the editor to a string', () => {
    expect(renderToString(createElement(App))).toContain('data-testid="tool-undo"')
  })

  /** Hydrates what the server rendered, in a browser with this user agent, and returns the errors of the hydration */
  const hydrate = async (userAgent?: string) => {
    const container = document.body.appendChild(document.createElement('div'))
    container.innerHTML = renderToString(createElement(App))
    // the warnings of the server are not those of the hydration
    vi.mocked(console.error).mockClear()

    // the server does not know the platform of the browser
    if (userAgent) vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
    const recoverableErrors: unknown[] = []
    await act(async () => {
      root = hydrateRoot(container, createElement(App), { onRecoverableError: error => recoverableErrors.push(error) })
    })
    return [...recoverableErrors, ...getErrors()]
  }

  /** The button of the toolbar which undoes, whose title and aria-keyshortcuts give its shortcut */
  const getUndoButton = () => document.querySelector('[data-testid="tool-undo"]')

  it('hydrates what the server rendered', async () => {
    expect(await hydrate()).toEqual([])
    expect(getUndoButton()?.getAttribute('title')).toContain('Ctrl+Z')
    expect(getUndoButton()?.getAttribute('aria-keyshortcuts')).toBe('Control+Z')
  })

  it('hydrates in a browser of a Mac what the server rendered, then gives the keys of a Mac', async () => {
    expect(await hydrate(MAC_USER_AGENT)).toEqual([])
    expect(getUndoButton()?.getAttribute('title')).toContain('⌘Z')
    expect(getUndoButton()?.getAttribute('aria-keyshortcuts')).toBe('Meta+Z')
  })
})
