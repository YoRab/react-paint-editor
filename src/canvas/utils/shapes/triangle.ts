import type { UtilsSettings } from '@canvas/constants/app'
import { createTrianglePath, getComputedShapeInfos } from '@canvas/utils/shapes/path'
import { getPolygonBorder } from '@canvas/utils/shapes/polygon'
import type { DrawableShape, Triangle } from '@common/types/Shapes'

export const getComputedTriangle = (triangle: DrawableShape<'triangle'>, settings: UtilsSettings) => {
  return getComputedShapeInfos(triangle, getPolygonBorder, settings)
}

const buildPath = (shape: DrawableShape<'triangle'>, settings: UtilsSettings) => {
  return {
    ...shape,
    path: createTrianglePath(shape),
    computed: getComputedTriangle(shape, settings)
  }
}

export const createTriangle = (triangle: Triangle, settings: UtilsSettings): DrawableShape<'triangle'> => {
  const triangleShape = {
    ...triangle,
    type: 'triangle'
  } as DrawableShape<'triangle'>

  return buildPath(triangleShape, settings)
}

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: DrawableShape<'triangle'>): void => {
  if (ctx.globalAlpha === 0) return
  if (!triangle.path) return
  triangle.style?.fillColor !== 'transparent' && ctx.fill(triangle.path)
  triangle.style?.strokeColor !== 'transparent' && ctx.stroke(triangle.path)
}
