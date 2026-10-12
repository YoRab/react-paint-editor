import type { ReactPaintEventName, ReactPaintEvents } from '@common/types/editor'
import { useCallback, useRef } from 'react'

type Listener = (...args: never[]) => void

export type EmitEvent = <E extends ReactPaintEventName>(event: E, ...args: Parameters<ReactPaintEvents[E]>) => void

const useEventEmitter = () => {
  const listeners = useRef<Record<ReactPaintEventName, Listener[]>>({
    dataChanged: [],
    selectionChanged: [],
    toolChanged: []
  })

  const registerEvent = useCallback(<E extends ReactPaintEventName>(event: E, fn: ReactPaintEvents[E]) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.current.hasOwnProperty(event)) return
    listeners.current[event] = [...listeners.current[event], fn]
  }, [])

  const unregisterEvent = useCallback(<E extends ReactPaintEventName>(event: E, fn?: ReactPaintEvents[E]) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.current.hasOwnProperty(event)) return
    if (fn) {
      const currentFnIndex = listeners.current[event].indexOf(fn)
      if (currentFnIndex === -1) return
      listeners.current[event] = [...listeners.current[event].slice(0, currentFnIndex), ...listeners.current[event].slice(currentFnIndex + 1)]
    } else {
      listeners.current[event] = []
    }
  }, [])

  const emit: EmitEvent = useCallback((event, ...args) => {
    for (const listener of listeners.current[event]) {
      ;(listener as unknown as (...listenerArgs: typeof args) => void)(...args)
    }
  }, [])

  return { registerEvent, unregisterEvent, emit }
}

export default useEventEmitter
