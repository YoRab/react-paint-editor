import { createReactPaint, getPaintStore } from '@canvas/store/internal'
import { createPaintStore } from '@canvas/store/paintStore'
import type { UseReactPaintProps } from '@canvas/store/types'
import type { ReactPaint } from '@common/types/editor'
import { useEffect, useLayoutEffect, useState } from 'react'

export type { UseReactPaintProps } from '@canvas/store/types'

/** Alias of ReactPaint */
export type UseReactPaintReturnType = ReactPaint

/**
 * Creates a canvas and returns its handle, to give to the Canvas and Editor components.
 * The handle keeps its identity, and the component calling the hook does not render again when the state changes:
 * read it with usePaintState.
 */
const useReactPaint = (props: UseReactPaintProps = {}): ReactPaint => {
  // created once, without side effect, so that StrictMode can call the initializer twice
  const [paint] = useState(() => createReactPaint(createPaintStore(props)))
  const store = getPaintStore(paint)

  // props are compared by value: inline options do not reset anything
  useLayoutEffect(() => {
    store.setConfig(props)
  })

  useEffect(() => {
    store.init()
  }, [store])

  return paint
}

export default useReactPaint
