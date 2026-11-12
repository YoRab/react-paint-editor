import { DRAWCANVAS_CLASSNAME } from '@canvas/constants/app'
import { Canvas, useReactPaint } from '@canvas/index'
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

const App = () => createElement(Canvas, { paint: useReactPaint() })

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

describe('server-side rendering', () => {
  it('renders the canvas to a string', () => {
    expect(renderToString(createElement(App))).toContain(DRAWCANVAS_CLASSNAME)
  })

  // confirmed defect, to fix at the step 6 of the plan: React 18 warns about each useLayoutEffect rendered on the server
  it.fails('renders on the server without a warning of React', () => {
    renderToString(createElement(App))
    expect(getErrors()).toEqual([])
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

  it('hydrates what the server rendered', async () => {
    expect(await hydrate()).toEqual([])
  })

  // confirmed defect, to fix at the step 6 of the plan: the keys of the instructions are written for the platform read
  // during the render, so their text differs on a Mac and the whole root is rendered again
  it.fails('hydrates in a browser of a Mac what the server rendered', async () => {
    expect(await hydrate(MAC_USER_AGENT)).toEqual([])
  })
})
