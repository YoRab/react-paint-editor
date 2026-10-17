import { createPaintStore } from '@canvas/store/paintStore'
import type { UseReactPaintProps } from '@canvas/store/types'
import type { ExportedDrawableShape } from '@canvas/types/Shapes'
import { vi } from 'vitest'

/** Path2D only exists in a browser: the store builds the paths of the shapes, without drawing them */
export const stubPath2D = () =>
  vi.stubGlobal(
    'Path2D',
    class {
      addPath() {}
      arc() {}
      arcTo() {}
      bezierCurveTo() {}
      closePath() {}
      ellipse() {}
      lineTo() {}
      moveTo() {}
      quadraticCurveTo() {}
      rect() {}
      roundRect() {}
    }
  )

const STYLE = { fillColor: 'red', strokeColor: 'black', lineWidth: 1, opacity: 100, lineDash: 0, lineArrow: 0, closedPoints: 0 }

export const RECTS: ExportedDrawableShape[] = [
  { type: 'rect', x: 100, y: 100, width: 100, height: 100, rotation: 0, style: STYLE },
  { type: 'rect', x: 300, y: 100, width: 100, height: 100, rotation: 0, style: STYLE },
  { type: 'rect', x: 500, y: 100, width: 100, height: 100, rotation: 0, style: STYLE }
]

/** A store holding the shapes, RECTS by default */
export const createLoadedStore = async (props: UseReactPaintProps = {}, shapes: ExportedDrawableShape[] = RECTS) => {
  const store = createPaintStore(props)
  await store.resetCanvas(shapes)
  return store
}
