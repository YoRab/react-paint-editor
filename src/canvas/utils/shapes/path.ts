import type { UtilsSettings } from '@canvas/constants/app'
import { scalePoint } from '@canvas/utils/transform'
import { rotatePoint } from '@canvas/utils/trigo'
import type { Circle, DrawableShape, Line, Point, Rect } from '@common/types/Shapes'

export const createRecPath = (rect: Rect): Path2D => {
  const path = new Path2D()
  path.rect(rect.x, rect.y, rect.width, rect.height)
  return path
}

export const createCirclePath = (shape: Circle): Path2D => {
  const path = new Path2D()
  path.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI)
  return path
}

export const createEllipsePath = (ellipse: DrawableShape<'ellipse'>): Path2D => {
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

export const createBrushPath = (brush: DrawableShape<'brush'>, { brushAlgo }: UtilsSettings): Path2D => {
  const path = new Path2D()

  if (brush.points.length < 1) return path

  const brushPoints = brush.points.flat()
  const brushPointX = brushPoints.map(point => point[0])
  const brushPointY = brushPoints.map(point => point[1])

  const minX = Math.min(...brushPointX)
  const minY = Math.min(...brushPointY)

  for (const points of brush.points) {
    if (!points.length) continue
    if (points.length === 1) {
      path.rect(...scalePoint(points[0]!, minX, minY, brush.scaleX, brush.scaleY), 1, 1)
    } else {
      path.moveTo(...scalePoint(points[0]!, minX, minY, brush.scaleX, brush.scaleY))
      switch (brushAlgo) {
        case 'quadratic':
          for (let i = 0; i < points.slice(1).length - 2; i++) {
            const scaledPoint = scalePoint(points[i]!, minX, minY, brush.scaleX, brush.scaleY)
            const scaledPoint2 = scalePoint(points[i + 1]!, minX, minY, brush.scaleX, brush.scaleY)
            const xc = (scaledPoint[0] + scaledPoint2[0]) / 2
            const yc = (scaledPoint[1] + scaledPoint2[1]) / 2
            path.quadraticCurveTo(...scaledPoint, xc, yc)
          }
          path.quadraticCurveTo(
            ...scalePoint(points[points.length - 2]!, minX, minY, brush.scaleX, brush.scaleY),
            ...scalePoint(points[points.length - 1]!, minX, minY, brush.scaleX, brush.scaleY)
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

/** Bounding box of a cubic Bezier segment B(t) = (1-t)³P0 + 3(1-t)²t P1 + 3(1-t)t² P2 + t³ P3 */
export const getCubicBezierBounds = (p0: Point, p1: Point, p2: Point, p3: Point): { minX: number; maxX: number; minY: number; maxY: number } => {
  const evalX = (t: number) => (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
  const evalY = (t: number) => (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]

  const roots = (a: number, b: number, c: number): number[] => {
    const A = a - 2 * b + c
    const B = -2 * a + 2 * b
    const C = a
    if (Math.abs(A) < 1e-10) {
      if (Math.abs(B) < 1e-10) return []
      const t = -C / B
      return t > 0 && t < 1 ? [t] : []
    }
    const disc = B * B - 4 * A * C
    if (disc < 0) return []
    const sqrtDisc = Math.sqrt(disc)
    const t1 = (-B - sqrtDisc) / (2 * A)
    const t2 = (-B + sqrtDisc) / (2 * A)
    const out: number[] = []
    if (t1 > 0 && t1 < 1) out.push(t1)
    if (t2 > 0 && t2 < 1 && t2 !== t1) out.push(t2)
    return out
  }

  const x0 = p0[0]
  const x1 = p1[0]
  const x2 = p2[0]
  const x3 = p3[0]
  const y0 = p0[1]
  const y1 = p1[1]
  const y2 = p2[1]
  const y3 = p3[1]
  const tsX = roots(x1 - x0, x2 - x1, x3 - x2)
  const tsY = roots(y1 - y0, y2 - y1, y3 - y2)

  let minX = Math.min(p0[0], p3[0])
  let maxX = Math.max(p0[0], p3[0])
  let minY = Math.min(p0[1], p3[1])
  let maxY = Math.max(p0[1], p3[1])
  for (const t of tsX) {
    const x = evalX(t)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  for (const t of tsY) {
    const y = evalY(t)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { minX, maxX, minY, maxY }
}

export const getCatmullRomPoints = (curve: DrawableShape<'curve'>, points: Point[]) => {
  const mustClosePath = curve.style?.closedPoints === 1 && points.length > 2
  // Pour une courbe fermée, on doit "boucler" les points pour la continuité
  // On ajoute les points de début et de fin pour le calcul Catmull-Rom

  // Pour Catmull-Rom, il faut au moins 4 points (p0, p1, p2, p3)
  const pts: Point[] = mustClosePath
    ? // Pour une courbe fermée, on duplique les points de début et de fin pour la continuité
      // Ajoute les deux derniers points au début et les deux premiers à la fin
      [points[points.length - 2]!, ...points, points[0]!, points[1]!]
    : // Pour une courbe ouverte, on duplique les extrémités
      [points[0]!, ...points, points[points.length - 1]!]
  return pts
}

export const catmullRomToBezier = (p0: Point, p1: Point, p2: Point, p3: Point): { cp1: Point; cp2: Point } => {
  // Conversion Catmull-Rom -> Bezier
  const cp1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const cp2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]

  return { cp1, cp2 }
}

export const createCurvePath = (curve: DrawableShape<'curve'>): Path2D => {
  const path = new Path2D()

  const points = curve.tempPoint ? [...curve.points, curve.tempPoint] : curve.points
  if (points.length < 2) return path
  if (points.length < 3) return createPolygonPath(curve)
  const mustClosePath = curve.style?.closedPoints === 1 && points.length > 2

  path.moveTo(...points[0]!)

  // Catmull-Rom to Bezier
  const pts = getCatmullRomPoints(curve, points)
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2]!

    const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3)

    path.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p2[0], p2[1])
  }

  if (mustClosePath) {
    path.closePath()
  }

  return path
}

export const createPolygonPath = (polygon: DrawableShape<'polygon'> | DrawableShape<'curve'>): Path2D => {
  const path = new Path2D()
  const points = polygon.tempPoint ? [...polygon.points, polygon.tempPoint] : polygon.points

  if (points.length < 2) return path

  path.moveTo(...points[0]!)
  for (const point of points.slice(1)) {
    path.lineTo(...point)
  }

  if (points.length > 2 && polygon.style?.closedPoints === 1) path.lineTo(...points[0]!)

  return path
}

export const createTrianglePath = (triangle: DrawableShape<'triangle'>): Path2D => {
  const path = new Path2D()
  path.moveTo(...triangle.points[0])
  path.lineTo(...triangle.points[1])
  path.lineTo(...triangle.points[2])
  path.lineTo(...triangle.points[0])
  return path
}

const getDefaultOuterBorder = (shape: DrawableShape, border: Rect) => {
  return {
    x: border.x - (shape.style?.lineWidth ?? 0) / 2,
    y: border.y - (shape.style?.lineWidth ?? 0) / 2,
    width: border.width + (shape.style?.lineWidth ?? 0),
    height: border.height + (shape.style?.lineWidth ?? 0)
  }
}

const getBoundingBox = (outerBorders: Rect, center: Point, rotation = 0) => {
  if (rotation === 0) return outerBorders
  const rotatedPoints = (
    [
      [outerBorders.x, outerBorders.y],
      [outerBorders.x + outerBorders.width, outerBorders.y],
      [outerBorders.x + outerBorders.width, outerBorders.y + outerBorders.height],
      [outerBorders.x, outerBorders.y + outerBorders.height]
    ] as Point[]
  ).map(point =>
    rotatePoint({
      point,
      origin: center,
      rotation
    })
  )

  const minX = Math.min(...rotatedPoints.map(point => point[0]))
  const minY = Math.min(...rotatedPoints.map(point => point[1]))
  const maxX = Math.max(...rotatedPoints.map(point => point[0]))
  const maxY = Math.max(...rotatedPoints.map(point => point[1]))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

export const getComputedShapeInfos = <T extends DrawableShape, U extends Pick<UtilsSettings, 'selectionPadding'>>(
  shape: T,
  getBorder: (shape: T, settings: U) => Rect,
  settings: U,
  getOuterBorder: (shape: T, borders: Rect, settings: U) => Rect = getDefaultOuterBorder
): {
  borders: Rect
  outerBorders: Rect
  center: Point
  boundingBox: Rect
} => {
  const borders = getBorder(shape, settings)
  const outerBorders = getOuterBorder(shape, borders, settings)
  const center = [borders.x + borders.width / 2, borders.y + borders.height / 2] as Point
  const boundingBox = getBoundingBox(outerBorders, center, shape.rotation)
  return { borders, outerBorders, center, boundingBox }
}
