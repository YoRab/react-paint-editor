// The drawings of the micro-benchmarks, as the store holds them, and how long their benchmarks run

import { createPaintStore } from '@canvas/store/paintStore'
import type { ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import { translateShape } from '@canvas/utils/shapes'
import type { BenchRunOptions } from 'vitest'
import { stubPath2D } from '../../canvas/unit/helpers'
import { generateMixedShapes } from '../shapes'

// Path2D only exists in a browser: the paths of the shapes are built with methods which do nothing. The micro-benchmarks
// measure the JavaScript of the library, the benchmark in Chromium measures the drawing
stubPath2D()

/** The numbers of shapes of the drawings measured */
export const SIZES = [500, 5000]

/**
 * Each benchmark runs for 500 ms after its warm-up, and 64 calls at least. A run of the same code differs from the next by
 * up to 12 %, much more than the error margin of its calls: a longer run would not make it more accurate.
 * `pnpm bench:compare --micro` compares 10 runs of each version instead
 */
export const RUN_OPTIONS: BenchRunOptions = { time: 500 }

/** A drawing of the benchmark, of shapes of all the types by default, in the store once loaded, and the settings of the store */
export const createDrawing = async (count: number, generateShapes: (count: number) => ShapeInput[] = generateMixedShapes) => {
  const store = createPaintStore()
  await store.actions.loadData({ shapes: generateShapes(count) })
  return { shapes: store.getState().document.shapes, settings: store.getSettings() }
}

export type Drawing = Awaited<ReturnType<typeof createDrawing>>

let drawings: Promise<Drawing[]> | undefined

/**
 * The drawings of shapes of all the types, one per size, built once per file by its first test: a file whose tests are
 * left out by `-t` builds none
 */
export const getDrawings = () => {
  drawings ??= Promise.all(SIZES.map(size => createDrawing(size)))
  return drawings
}

/** The shapes of a drawing after a move of the shape in the foreground, the last one, which the user mostly changes */
export const moveLastShape = ({ shapes, settings }: Drawing): ShapeEntity[] => [
  ...shapes.slice(0, -1),
  translateShape(shapes.at(-1)!, 10, 10, settings)
]

/** The shapes of a drawing after a move of all of them */
export const moveAllShapes = ({ shapes, settings }: Drawing): ShapeEntity[] => shapes.map(shape => translateShape(shape, 10, 10, settings))
