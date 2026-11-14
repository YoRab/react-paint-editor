import type { ReactPaint, ReactPaintEventArgs, ReactPaintEventName, ReactPaintEvents } from '@canvas/types/editor'

type EmitEvent = <E extends ReactPaintEventName>(event: E, ...args: ReactPaintEventArgs[E]) => void

type EventEmitter = {
  registerEvent: ReactPaint['registerEvent']
  emit: EmitEvent
  /** Whether a listener is registered, to skip the work of an event nobody listens to */
  hasListeners: (event: ReactPaintEventName) => boolean
}

export const createEventEmitter = (): EventEmitter => {
  const listeners: { [E in ReactPaintEventName]: ReactPaintEvents[E][] } = {
    dataChanged: [],
    shapesChanged: [],
    selectionChanged: [],
    toolChanged: [],
    viewChanged: [],
    gridChanged: [],
    toolsChanged: [],
    historyChanged: [],
    clipboardChanged: [],
    contextMenuChanged: [],
    optionsChanged: [],
    shapeClicked: [],
    shapeHovered: [],
    canvasClicked: [],
    canvasDoubleClicked: [],
    pictureDropFailed: [],
    pictureLoaded: [],
    pictureLoadFailed: [],
    dataLoadFailed: [],
    customShapeLoadFailed: []
  }

  const registerEvent: EventEmitter['registerEvent'] = (event, fn) => {
    if (!Object.hasOwn(listeners, event)) return () => {}
    const eventListeners = listeners[event]
    eventListeners.push(fn)
    // called twice, it leaves the other listeners
    return () => {
      const index = eventListeners.indexOf(fn)
      if (index !== -1) eventListeners.splice(index, 1)
    }
  }

  // a copy: the listeners registered or unregistered by a listener do not change this emission
  const emit: EmitEvent = (event, ...args) => {
    for (const listener of [...listeners[event]]) listener(...args)
  }

  const hasListeners: EventEmitter['hasListeners'] = event => listeners[event].length > 0

  return { registerEvent, emit, hasListeners }
}
