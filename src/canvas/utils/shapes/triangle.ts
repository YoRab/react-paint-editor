import { createTrianglePath } from '@canvas/utils/shapes/path'
import type { DrawableShape, Triangle } from '@common/types/Shapes'

const buildPath = (shape: DrawableShape<'triangle'>) => {
  return {
    ...shape,
    path: createTrianglePath(shape)
  }
}

export const createTriangle = (triangle: Triangle): DrawableShape<'triangle'> => {
  const triangleShape = {
    ...triangle,
    type: 'triangle'
  } as DrawableShape<'triangle'>

  return buildPath(triangleShape)
}

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: DrawableShape<'triangle'>): void => {
  if (ctx.globalAlpha === 0) return
  if (!triangle.path) return
  triangle.style?.fillColor !== 'transparent' && ctx.fill(triangle.path)
  triangle.style?.strokeColor !== 'transparent' && ctx.stroke(triangle.path)
}
