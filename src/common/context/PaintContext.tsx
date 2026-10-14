import type { ReactPaint } from '@common/types/editor'
import { createContext, type ReactNode, useContext } from 'react'

const PaintContext = createContext<ReactPaint | undefined>(undefined)

/** Gives a canvas handle to the components below, which read it with usePaint. The Editor component already provides it */
export const PaintProvider = ({ paint, children }: { paint: ReactPaint; children?: ReactNode }) => (
  <PaintContext.Provider value={paint}>{children}</PaintContext.Provider>
)

/** Returns the canvas handle given by the closest PaintProvider or Editor */
export const usePaint = (): ReactPaint => {
  const paint = useContext(PaintContext)
  if (!paint) {
    throw new Error('usePaint must be used inside a PaintProvider or an Editor')
  }
  return paint
}
