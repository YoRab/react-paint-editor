// The functions which follow a change of the drawing: its changes and its data given to the consumer, the changes received
// from another instance, and the step saved in the history

import { INITIAL_SHAPES_STATE, shapesReducer } from '@canvas/store/shapesReducer'
import type { DataChanges } from '@canvas/types/editor'
import type { ShapeEntity } from '@canvas/types/Shapes'
import { applyDataChanges, type BuildReceivedShape } from '@canvas/utils/applyChanges'
import { buildDataToExport, getDataChanges } from '@canvas/utils/data'
import { buildShapeEntity } from '@canvas/utils/shapeInput'
import { type Bench, test } from 'vitest'
import { MEASURE_CONTEXT } from '../../canvas/unit/helpers'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../shapes'
import { type Drawing, getDrawings, moveAllShapes, moveLastShape, RUN_OPTIONS } from './setup'

const ONE_MOVED = '1 moved'

/** The changes of each drawing: a shape moved, and all the shapes moved */
const CHANGES = [
  [ONE_MOVED, moveLastShape],
  ['all moved', moveAllShapes]
] as const

/** The name of a benchmark of a change of a drawing */
const getName = ({ shapes }: Drawing, change: string) => `${shapes.length} shapes, ${change}`

/**
 * The benchmarks of a function called after each change of each drawing, with the shapes changed: new objects at each
 * call, made out of the time measured, like the ones of each step, whose export is not cached yet
 */
const benchChanges = async (bench: Bench, measure: (drawing: Drawing, shapes: ShapeEntity[]) => unknown) =>
  (await getDrawings()).flatMap(drawing =>
    CHANGES.map(([change, getShapes]) => {
      let shapes: ShapeEntity[] = []
      return bench(
        getName(drawing, change),
        {
          beforeEach: () => {
            shapes = getShapes(drawing)
          }
        },
        () => measure(drawing, shapes)
      )
    })
  )

test('getDataChanges: the changes of shapesChanged and dataChanged', async ({ bench }) => {
  await bench.compare(...(await benchChanges(bench, (drawing, shapes) => getDataChanges(drawing.shapes, shapes))), RUN_OPTIONS)
})

test('buildDataToExport: the data of dataChanged', async ({ bench }) => {
  await bench.compare(...(await benchChanges(bench, (_drawing, shapes) => buildDataToExport(shapes, CANVAS_WIDTH, CANVAS_HEIGHT))), RUN_OPTIONS)
})

test('applyDataChanges: the changes received by applyChanges', async ({ bench }) => {
  await bench.compare(
    ...(await getDrawings()).flatMap(drawing => {
      // the entities of the shapes received, built like the ones of the store
      const buildShape: BuildReceivedShape = exported =>
        buildShapeEntity(exported, { ctx: MEASURE_CONTEXT, settings: drawing.settings, tools: [], usedIds: new Set(), completeStyle: false })
      return CHANGES.map(([change, getShapes]) => {
        // through the network
        const changes = JSON.parse(JSON.stringify(getDataChanges(drawing.shapes, getShapes(drawing)))) as DataChanges
        return bench(getName(drawing, change), () => applyDataChanges(drawing.shapes, changes, buildShape, drawing.settings))
      })
    }),
    RUN_OPTIONS
  )
})

test('shapesReducer: a step saved by SET_SHAPES', async ({ bench }) => {
  await bench.compare(
    ...(await getDrawings()).flatMap(drawing => {
      const state = { ...INITIAL_SHAPES_STATE, shapes: drawing.shapes, base: drawing.shapes, saved: drawing.shapes }
      const saveStep = (shapes: ShapeEntity[]) => () => shapesReducer(state, { type: 'SET_SHAPES', shapes, newSelectedShape: undefined, save: true })
      return [
        bench(getName(drawing, ONE_MOVED), saveStep(moveLastShape(drawing))),
        // the step compares all the shapes, one by one, with the ones of the previous step, and saves nothing
        bench(getName(drawing, 'all rebuilt without change'), saveStep(drawing.shapes.map(shape => ({ ...shape }))))
      ]
    }),
    RUN_OPTIONS
  )
})
