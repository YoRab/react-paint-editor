import Loading from '@editor/components/common/Loading'
import { LOADING_TRANSITION_DURATION } from '@editor/constants/loading'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * @vitest-environment jsdom
 */

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)

let root: Root
let container: HTMLElement

const render = (isLoading: boolean) => act(() => root.render(createElement(Loading, { isLoading })))
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
/** The state of the loader, undefined when it is not rendered */
const getLoadingState = () => container.querySelector<HTMLElement>('.react-paint-editor-loading')?.dataset.loading

describe('Loading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
  })

  it('renders nothing at the mount without loading', () => {
    render(false)
    expect(getLoadingState()).toBeUndefined()
    wait(LOADING_TRANSITION_DURATION)
    expect(getLoadingState()).toBeUndefined()
  })

  it('shows during a loading, then fades out and is removed', () => {
    render(false)
    render(true)
    expect(getLoadingState()).toBe('visible')
    render(false)
    expect(getLoadingState()).toBe('fadeOut')
    wait(LOADING_TRANSITION_DURATION - 1)
    expect(getLoadingState()).toBe('fadeOut')
    wait(1)
    expect(getLoadingState()).toBeUndefined()
  })

  it('shows at the mount during a loading', () => {
    render(true)
    expect(getLoadingState()).toBe('visible')
  })

  it('stays shown when a loading starts during the fade-out', () => {
    render(true)
    render(false)
    render(true)
    wait(LOADING_TRANSITION_DURATION)
    expect(getLoadingState()).toBe('visible')
  })
})
