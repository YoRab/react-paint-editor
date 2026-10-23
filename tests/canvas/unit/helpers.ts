import type { UtilsSettings } from '@canvas/constants/app'
import { createPaintStore, type PaintStore } from '@canvas/store/paintStore'
import type { UseReactPaintProps } from '@canvas/store/types'
import type { DrawableShape, ExportedDrawableShape, ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import { getUnscaledCanvasSize } from '@canvas/utils/canvas'
import { refreshShape } from '@canvas/utils/shapes'
import { vi } from 'vitest'

/** Images of the tests: they load once their source is set, as large as given by size, or fail when fails says so */
export class FakeImage {
  static fails = (_src: string) => false
  static size = (_src: string) => 100
  complete = false
  width = 0
  height = 0
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  source = ''

  get src() {
    return this.source
  }

  set src(value: string) {
    this.source = value
    setTimeout(() => {
      this.complete = true
      if (FakeImage.fails(value)) {
        this.onerror?.()
        return
      }
      this.width = this.height = this.naturalWidth = this.naturalHeight = FakeImage.size(value)
      this.onload?.()
    })
  }
}

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

/** Settings of the utils of the shapes, without the store: a selection padding of 5, without grid */
export const UTILS_SETTINGS = { selectionPadding: 5, gridGap: 0 } as UtilsSettings

/** A shape with its path and its borders, as the store holds it */
export const createShape = <T extends ShapeEntity = ShapeEntity>(shape: ShapeInput, id = `${shape.type}_1`) =>
  refreshShape({ id, ...shape } as DrawableShape & { id: string }, UTILS_SETTINGS) as T

/** Measures 1 pixel per character at the font size 1: a text of 5 characters 50 wide has a font size of 10 */
export const MEASURE_CONTEXT = { font: '', measureText: (text: string) => ({ width: text.length }) } as unknown as CanvasRenderingContext2D

const STYLE = { fillColor: 'red', strokeColor: 'black', lineWidth: 1, opacity: 100, lineDash: 0, lineArrow: 0, closedPoints: 0 }

export const RECTS: ExportedDrawableShape[] = [
  { type: 'rect', x: 100, y: 100, width: 100, height: 100, rotation: 0, style: STYLE },
  { type: 'rect', x: 300, y: 100, width: 100, height: 100, rotation: 0, style: STYLE },
  { type: 'rect', x: 500, y: 100, width: 100, height: 100, rotation: 0, style: STYLE }
]

/** A store holding the shapes, RECTS by default */
export const createLoadedStore = async (props: UseReactPaintProps = {}, shapes: ShapeInput[] = RECTS) => {
  const store = createPaintStore(props)
  await store.resetCanvas(shapes)
  return store
}

/** Size measured by a Canvas filling its container: the scale is 1 */
export const extendTo = (store: PaintStore, width: number, height: number) => store.setCanvasSize(getUnscaledCanvasSize(width, height))
