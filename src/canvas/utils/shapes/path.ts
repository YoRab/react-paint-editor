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
  if (curve.points.length < 2) return undefined
  if (curve.points.length < 3) return createPolygonPath(curve)

  const mustClosePath = curve.style?.closedPoints === 1 && curve.points.length > 2
  // Pour une courbe fermée, on doit "boucler" les points pour la continuité
  // On ajoute les points de début et de fin pour le calcul Catmull-Rom
  const points = curve.points

  // Pour Catmull-Rom, il faut au moins 4 points (p0, p1, p2, p3)
  const pts: [number, number][] = mustClosePath
    ? // Pour une courbe fermée, on duplique les points de début et de fin pour la continuité
      // Ajoute les deux derniers points au début et les deux premiers à la fin
      [points[points.length - 2], ...points, points[0], points[1]]
    : // Pour une courbe ouverte, on duplique les extrémités
      [points[0], ...points, points[points.length - 1]]

  const path = new Path2D()
  path.moveTo(...points[0])

  // Catmull-Rom to Bezier
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2]

    // Conversion Catmull-Rom -> Bezier
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6

    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
  }

  if (mustClosePath) {
    path.closePath()
  }

  return path
}

export const createPolygonPath = (polygon: DrawableShape<'polygon'> | DrawableShape<'curve'>) => {
  if (polygon.points.length < 2) return undefined

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
