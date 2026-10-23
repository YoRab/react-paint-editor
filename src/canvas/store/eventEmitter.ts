import type { ReactPaint, ReactPaintEventArgs, ReactPaintEventName, ReactPaintEvents } from '@canvas/types/editor'

type EmitEvent = <E extends ReactPaintEventName>(event: E, ...args: ReactPaintEventArgs[E]) => void

type EventEmitter = {
  registerEvent: ReactPaint['registerEvent']
  unregisterEvent: ReactPaint['unregisterEvent']
  emit: EmitEvent
  /** Whether a listener is registered, to skip the work of an event nobody listens to */
  hasListeners: (event: ReactPaintEventName) => boolean
}

export const createEventEmitter = (): EventEmitter => {
  const listeners: { [E in ReactPaintEventName]: ReactPaintEvents[E][] } = {
    dataChanged: [],
    selectionChanged: [],
    toolChanged: [],
    shapeClicked: [],
    shapeHovered: [],
    canvasClicked: [],
    canvasDoubleClicked: [],
    pictureDropFailed: [],
    pictureLoaded: [],
    pictureLoadFailed: []
  }

  const unregisterEvent: EventEmitter['unregisterEvent'] = (event, fn) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (!listeners.hasOwnProperty(event)) return
    if (fn) {
      const currentFnIndex = listeners[event].indexOf(fn)
      if (currentFnIndex !== -1) listeners[event].splice(currentFnIndex, 1)
    } else {
      listeners[event].length = 0
    }
  }

  const registerEvent: EventEmitter['registerEvent'] = (event, fn) => {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: be compliant with es2020
    if (listeners.hasOwnProperty(event)) listeners[event].push(fn)
    return () => unregisterEvent(event, fn)
  }

  // a copy: the listeners registered or unregistered by a listener do not change this emission
  const emit: EmitEvent = (event, ...args) => {
    for (const listener of [...listeners[event]]) listener(...args)
  }

  const hasListeners: EventEmitter['hasListeners'] = event => listeners[event].length > 0

  return { registerEvent, unregisterEvent, emit, hasListeners }
}
