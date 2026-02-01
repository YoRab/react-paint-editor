import type { UtilsSettings } from '@canvas/constants/app'
import { createTrianglePath, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { getPolygonBorder } from '@canvas/utils/shapes/polygon'
import type { DrawableShape, Triangle, TriangleEntity } from '@common/types/Shapes'
import { uniqueId } from '@common/utils/util'

const getComputedTriangle = (triangle: DrawableShape<'triangle'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(triangle, getPolygonBorder, settings)
}

const buildPath = (shape: DrawableShape<'triangle'> & { id: string }, settings: UtilsSettings): TriangleEntity => {
  return {
    ...shape,
    path: createTrianglePath(shape),
    computed: getComputedTriangle(shape, settings)
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
  if (ctx.globalAlpha === 0) return
  if (!triangle.path) return
  triangle.style?.fillColor !== 'transparent' && ctx.fill(triangle.path)
  triangle.style?.strokeColor !== 'transparent' && ctx.stroke(triangle.path)
}
