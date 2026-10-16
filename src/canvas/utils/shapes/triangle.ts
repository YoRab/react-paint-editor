import type { UtilsSettings } from '@canvas/constants/app'
import type { DrawableShape, Triangle, TriangleEntity } from '@canvas/types/Shapes'
import { drawPathWithFillAndStroke } from '@canvas/utils/canvas'
import { createTrianglePath, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { getPolygonBorder } from '@canvas/utils/shapes/polygon'
import { uniqueId } from '@canvas/utils/util'

const buildPath = (shape: DrawableShape<'triangle'> & { id: string }, settings: UtilsSettings): TriangleEntity => {
  return {
    ...shape,
    path: createTrianglePath(shape),
    computed: getComputedShapeInfos(shape, getPolygonBorder, settings)
  }
}

export const createTriangle = (triangle: Triangle, settings: UtilsSettings): TriangleEntity => {
  const triangleShape = {
    ...triangle,
    id: uniqueId('triangle_'),
    type: 'triangle' as const
  }

  return buildPath(triangleShape, settings)
}

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: TriangleEntity): void => {
  drawPathWithFillAndStroke(ctx, triangle.path, triangle.style)
}
