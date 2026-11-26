// The load of data: their migration to the last version of the format, and the entities of their shapes

import { buildDataToExport } from '@canvas/utils/data'
import { migrateData } from '@canvas/utils/migrations'
import { decodeImportedData } from '@canvas/utils/shapeInput'
import { test } from 'vitest'
import { MEASURE_CONTEXT } from '../../canvas/unit/helpers'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../shapes'
import { getDrawings, RUN_OPTIONS } from './setup'

test('migrateData and decodeImportedData: the shapes of loadData', async ({ bench }) => {
  await bench.compare(
    ...(await getDrawings()).map(({ shapes, settings }) => {
      // the data of the drawing, as a save gives them back once parsed
      const data = JSON.parse(JSON.stringify(buildDataToExport(shapes, CANVAS_WIDTH, CANVAS_HEIGHT)))
      return bench(`${shapes.length} shapes`, () =>
        decodeImportedData(migrateData(data).shapes as typeof data.shapes, { ctx: MEASURE_CONTEXT, settings, tools: [], usedIds: new Set() })
      )
    }),
    RUN_OPTIONS
  )
})
