import usePaintState from '@canvas/hooks/usePaintState'
import type { ReactPaint } from '@canvas/types/editor'
import { type CSSProperties, useMemo } from 'react'

/** Style of an element laid over the canvas, like a picture to annotate, so that it follows the zoom and the moves of the view */
const useAnnotationsStyle = (paint: ReactPaint): CSSProperties => {
  const { zoom, offset } = usePaintState(paint, state => state.view)
  const width = usePaintState(paint, state => state.width)
  const height = usePaintState(paint, state => state.height)

  return useMemo(
    () => ({
      userSelect: 'none',
      touchAction: 'none',
      transformOrigin: 'left top',
      transform:
        'scale(var(--react-paint-canvas-zoom)) translate(calc(var(--react-paint-canvas-offset-x) * 100% / var(--react-paint-app-canvaswidth)), calc(var(--react-paint-canvas-offset-y) * 100% / var(--react-paint-app-canvasheight)))',
      '--react-paint-canvas-zoom': zoom,
      '--react-paint-canvas-offset-x': offset[0],
      '--react-paint-canvas-offset-y': offset[1],
      '--react-paint-app-canvaswidth': width,
      '--react-paint-app-canvasheight': height
    }),
    [zoom, offset, width, height]
  )
}

export default useAnnotationsStyle
