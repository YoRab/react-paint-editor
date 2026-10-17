import type { PaintStore } from '@canvas/store/paintStore'
import type { ReactPaint } from '@canvas/types/editor'

/**
 * Key of the internal store on the handle. It is not part of the public type: only the Canvas component reads it.
 * Symbol.for keeps the link even when two copies of the library are loaded.
 */
const STORE_KEY: unique symbol = Symbol.for('@yorab/react-paint/store')

type ReactPaintWithStore = ReactPaint & { [STORE_KEY]: PaintStore }

/** Creates the public handle of a store */
export const createReactPaint = (store: PaintStore): ReactPaint => {
  const paint: ReactPaintWithStore = {
    actions: store.actions,
    getState: store.getEditorState,
    subscribe: store.subscribe,
    registerEvent: store.registerEvent,
    unregisterEvent: store.unregisterEvent,
    resetCanvas: (shapes, clearHistory) => void store.resetCanvas(shapes, clearHistory),
    getCurrentImage: store.getCurrentImage,
    getCurrentData: store.getCurrentData,
    scopeRef: store.setScopeElement,
    [STORE_KEY]: store
  }
  return paint
}

export const getPaintStore = (paint: ReactPaint): PaintStore => {
  const store = (paint as Partial<ReactPaintWithStore>)[STORE_KEY]
  if (!store) {
    throw new Error('The paint prop must be the value returned by useReactPaint')
  }
  return store
}
