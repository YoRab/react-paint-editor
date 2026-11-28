// A long brush: its bounds, its move, and a point added to its last stroke

import type { ShapeEntity } from '@canvas/types/Shapes'
import { translateShape } from '@canvas/utils/shapes'
import { addNewPointToShape, getBrushBorder } from '@canvas/utils/shapes/brush'
import { test } from 'vitest'
import { generateLongBrush } from '../shapes'
import { createDrawing, RUN_OPTIONS } from './setup'

test('a brush of 4 strokes of 1000 points', async ({ bench }) => {
  // the brush of the scenarios long-brush and translate-long-brush of the benchmark
  const { shapes, settings } = await createDrawing(1, generateLongBrush)
  const brush = shapes[0] as ShapeEntity<'brush'>
  await bench.compare(
    bench('bounds', () => getBrushBorder(brush, settings)),
    bench('moved', () => translateShape(brush, 10, 10, settings)),
    bench('a point added', () => addNewPointToShape(brush, [500, 300], settings)),
    RUN_OPTIONS
  )
})
