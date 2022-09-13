import { DrawableTriangle, Triangle } from 'types/Shapes'

export const createTrianglePath = (triangle: DrawableTriangle) => {
  const path = new Path2D()
  path.moveTo(...triangle.points[0])
  path.lineTo(...triangle.points[1])
  path.lineTo(...triangle.points[2])
  path.lineTo(...triangle.points[0])
  return path
}

const buildPath = (shape: DrawableTriangle) => {
  return {
    ...shape,
    path: createTrianglePath(shape)
  }
}

export const createTriangle = (triangle: Triangle): DrawableTriangle => {
  const triangleShape = {
    ...triangle,
    type: 'triangle'
  } as DrawableTriangle

  return buildPath(triangleShape)
}

export const drawTriangle = (ctx: CanvasRenderingContext2D, triangle: DrawableTriangle): void => {
  if (ctx.globalAlpha === 0) return
  if (!triangle.path) return
  console.log('drawtiranfl')
  triangle.style?.fillColor !== 'transparent' && ctx.fill(triangle.path)
  triangle.style?.strokeColor !== 'transparent' && ctx.stroke(triangle.path)
}
