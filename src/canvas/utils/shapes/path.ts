import type { UtilsSettings } from '@canvas/constants/app'
import { scalePoint } from '@canvas/utils/transform'
import type { Circle, DrawableShape, Line, Rect } from '@common/types/Shapes'

export const createRecPath = (rect: Rect) => {
  const path = new Path2D()
  path.rect(rect.x, rect.y, rect.width, rect.height)
  return path
}

export const createCirclePath = (shape: Circle) => {
  const path = new Path2D()
  path.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI)
  return path
}

export const createEllipsePath = (ellipse: DrawableShape<'ellipse'>) => {
  const path = new Path2D()
  path.ellipse(ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, 0, 0, 2 * Math.PI)
  return path
}

export const createLinePath = (line: Line) => {
  const path = new Path2D()
  path.moveTo(...line.points[0])
  path.lineTo(...line.points[1])
  return path
}

export const createBrushPath = (brush: DrawableShape<'brush'>, { brushAlgo }: UtilsSettings) => {
  if (brush.points.length < 1 || brush.style?.strokeColor === 'transparent') return undefined

  const brushPoints = brush.points.flat()
  const brushPointX = brushPoints.map(point => point[0])
  const brushPointY = brushPoints.map(point => point[1])

  const minX = Math.min(...brushPointX)
  const minY = Math.min(...brushPointY)

  const path = new Path2D()

  for (const points of brush.points) {
    if (!points.length) return
    if (points.length === 1) {
      path.rect(...scalePoint(points[0], minX, minY, brush.scaleX, brush.scaleY), 1, 1)
    } else {
      path.moveTo(...scalePoint(points[0], minX, minY, brush.scaleX, brush.scaleY))
      switch (brushAlgo) {
        case 'quadratic':
          for (let i = 0; i < points.slice(1).length - 2; i++) {
            const scaledPoint = scalePoint(points[i], minX, minY, brush.scaleX, brush.scaleY)
            const scaledPoint2 = scalePoint(points[i + 1], minX, minY, brush.scaleX, brush.scaleY)
            const xc = (scaledPoint[0] + scaledPoint2[0]) / 2
            const yc = (scaledPoint[1] + scaledPoint2[1]) / 2
            path.quadraticCurveTo(...scaledPoint, xc, yc)
          }
          path.quadraticCurveTo(
            ...scalePoint(points[points.length - 2], minX, minY, brush.scaleX, brush.scaleY),
            ...scalePoint(points[points.length - 1], minX, minY, brush.scaleX, brush.scaleY)
          )
          break
        default:
          for (const point of points.slice(1)) {
            path.lineTo(...scalePoint(point, minX, minY, brush.scaleX, brush.scaleY))
          }
          break
      }
    }
  }

  return path
}

export const createCurvePath = (curve: DrawableShape<'curve'>) => {
  if (curve.points.length < 3) return undefined

  const path = new Path2D()

  path.moveTo(...curve.points[0])
  for (let i = 1; i < curve.points.length - 1; i++) {
    path.quadraticCurveTo(
      ...curve.points[i],
      curve.points.length - 2 === i ? curve.points[i + 1][0] : (curve.points[i + 1][0] - curve.points[i][0]) / 2 + curve.points[i][0],
      curve.points.length - 2 === i ? curve.points[i + 1][1] : (curve.points[i + 1][1] - curve.points[i][1]) / 2 + curve.points[i][1]
    )
  }

  return path
}

export const createPolygonPath = (polygon: DrawableShape<'polygon'>) => {
  if (polygon.points.length < 1) return undefined

  const path = new Path2D()

  path.moveTo(...polygon.points[0])
  for (const point of polygon.points.slice(1)) {
    path.lineTo(...point)
  }

  if (polygon.points.length > 2 && polygon.style?.closedPoints === 1) path.lineTo(...polygon.points[0])

  return path
}

export const createTrianglePath = (triangle: DrawableShape<'triangle'>) => {
  const path = new Path2D()
  path.moveTo(...triangle.points[0])
  path.lineTo(...triangle.points[1])
  path.lineTo(...triangle.points[2])
  path.lineTo(...triangle.points[0])
  return path
}
