import type { ReactPaintEventName, ReactPaintEvents } from '@canvas/types/editor'

type Listener = (...args: never[]) => void

type EmitEvent = <E extends ReactPaintEventName>(event: E, ...args: Parameters<ReactPaintEvents[E]>) => void

type EventEmitter = {
  /** Returns the function that unregisters the listener */
  registerEvent: <E extends ReactPaintEventName>(event: E, fn: ReactPaintEvents[E]) => () => void
  /** Unregisters the listener, or all the listeners of the event when none is given */
  unregisterEvent: <E extends ReactPaintEventName>(event: E, fn?: ReactPaintEvents[E]) => void
  emit: EmitEvent
  /** Whether a listener is registered, to skip the work of an event nobody listens to */
  hasListeners: (event: ReactPaintEventName) => boolean
}

export const createEventEmitter = (): EventEmitter => {
  const listeners: Record<ReactPaintEventName, Listener[]> = {
    dataChanged: [],
    selectionChanged: [],
    toolChanged: [],
    shapeClicked: [],
    shapeHovered: []
  }

  const unregisterEvent: EventEmitter['unregisterEvent'] = (event, fn) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.hasOwnProperty(event)) return
    if (fn) {
      const currentFnIndex = listeners[event].indexOf(fn)
      if (currentFnIndex === -1) return
      listeners[event] = [...listeners[event].slice(0, currentFnIndex), ...listeners[event].slice(currentFnIndex + 1)]
    } else {
      listeners[event] = []
    }
  }

  const registerEvent: EventEmitter['registerEvent'] = (event, fn) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (listeners.hasOwnProperty(event)) listeners[event] = [...listeners[event], fn]
    return () => unregisterEvent(event, fn)
  }

  const emit: EmitEvent = (event, ...args) => {
    for (const listener of listeners[event]) {
      ;(listener as unknown as (...listenerArgs: typeof args) => void)(...args)
    }
  }

  const hasListeners: EventEmitter['hasListeners'] = event => listeners[event].length > 0

  return { registerEvent, unregisterEvent, emit, hasListeners }
}
