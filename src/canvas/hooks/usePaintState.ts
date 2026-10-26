import type { EditorState, ReactPaint } from '@canvas/types/editor'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

const selectAll = (state: EditorState) => state

/**
 * Reads the state of a canvas during the render, and renders again only when the selected value changes.
 * Without selector, returns the whole state. A selector building an object or an array needs an equality
 * function, like shallowEqual, otherwise the component renders on each change of the state.
 */
function usePaintState(paint: ReactPaint): EditorState
function usePaintState<T>(paint: ReactPaint, selector: (state: EditorState) => T, isEqual?: (a: T, b: T) => boolean): T
function usePaintState<T>(paint: ReactPaint, selector?: (state: EditorState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const select = (selector ?? selectAll) as (state: EditorState) => T
  // last value returned to the component, kept between selectors since an inline selector changes on each render
  const lastValue = useRef<{ value: T } | null>(null)
  // the selector is checked once, on its first call
  const hasCheckedSelector = useRef(false)

  // same logic as useSyncExternalStoreWithSelector (use-sync-external-store/with-selector)
  const getSelection = useMemo(() => {
    let memoized: { state: EditorState; selection: T } | undefined
    return () => {
      const state = paint.getState()
      if (memoized && Object.is(memoized.state, state)) return memoized.selection

      const selection = select(state)
      // import.meta.env.DEV is replaced by false at build time: the check is removed from the published bundles.
      if (import.meta.env.DEV && !hasCheckedSelector.current) {
        hasCheckedSelector.current = true
        if (!isEqual(selection, select(state))) {
          console.warn(
            'usePaintState: the selector returns a new value on each call, so the component renders on each change of the state. Return an existing value, or give an equality function like shallowEqual.'
          )
        }
      }
      // an equal value keeps its identity, so that the component does not render again
      const previous = memoized ?? (lastValue.current ? { selection: lastValue.current.value } : undefined)
      memoized = { state, selection: previous && isEqual(previous.selection, selection) ? previous.selection : selection }
      return memoized.selection
    }
  }, [paint, select, isEqual])

  const value = useSyncExternalStore(paint.subscribe, getSelection, getSelection)

  useEffect(() => {
    lastValue.current = { value }
  }, [value])

  return value
}

export default usePaintState
