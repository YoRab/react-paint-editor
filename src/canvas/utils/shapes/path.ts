import type { UtilsSettings } from '@canvas/constants/app'
import { MITER_LIMIT } from '@canvas/constants/rendering'
import type { Circle, DrawableShape, Line, Point, Rect, ShapeEntity } from '@canvas/types/Shapes'
import { scalePoint } from '@canvas/utils/transform'
import { type Bounds, getCenter, getDistanceBetweenPoints, getPointsBounds, getRectCorners, rotatePoint } from '@canvas/utils/trigo'
import { clamp } from '@canvas/utils/util'

export const createRecPath = (rect: Rect, radius = 0): Path2D => {
  const path = new Path2D()
  if (radius > 0) path.roundRect(rect.x, rect.y, rect.width, rect.height, radius)
  else path.rect(rect.x, rect.y, rect.width, rect.height)
  return path
}

/** Radius of the corners of a rectangle, a square or a picture as drawn: at most half of its smallest side */
export const getCornerRadius = (shape: Rect & Pick<DrawableShape, 'style'>): number =>
  clamp(shape.style?.cornerRadius ?? 0, 0, Math.min(Math.abs(shape.width), Math.abs(shape.height)) / 2)

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

/** Bounds of the lists of points made by addBrushPoint, so that a growing stroke does not measure all its points again */
const strokeBounds = new WeakMap<Point[][], Bounds>()

/** Bounds of the points of a brush, without its scale */
export const getBrushPointsBounds = (points: Point[][]): Bounds => strokeBounds.get(points) ?? getPointsBounds(points)

/** The points of a brush with a new point at the end of a stroke, or in a new stroke when the index is the number of strokes */
export const addBrushPoint = (points: Point[][], strokeIndex: number, point: Point): Point[][] => {
  const newPoints = [...points]
  newPoints[strokeIndex] = [...(points[strokeIndex] ?? []), point]
  const { minX, minY, maxX, maxY } = getBrushPointsBounds(points)
  strokeBounds.set(newPoints, {
    minX: Math.min(minX, point[0]),
    minY: Math.min(minY, point[1]),
    maxX: Math.max(maxX, point[0]),
    maxY: Math.max(maxY, point[1])
  })
  return newPoints
}

/** Whether the points of the brush are drawn as they are: a new point of a stroke then only extends its path */
const isUnscaledBrush = (brush: DrawableShape<'brush'>) => (brush.scaleX ?? 1) === 1 && (brush.scaleY ?? 1) === 1

const keepPoint = (point: Point) => point

/** Places the points of a brush as they are drawn: scaled from the top left corner of the brush */
export const getBrushPointScaler = (brush: DrawableShape<'brush'>): ((point: Point) => Point) => {
  if (isUnscaledBrush(brush)) return keepPoint
  const { minX, minY } = getBrushPointsBounds(brush.points)
  return point => scalePoint(point, minX, minY, brush.scaleX, brush.scaleY)
}

/**
 * The path of the brush with a new point at the end of its last stroke, extended instead of built again from all
 * the points. Undefined when it must be built again: a single point is drawn as a square, and the end of a smoothed
 * stroke changes with each point
 */
export const extendBrushPath = (brush: ShapeEntity<'brush'>, point: Point, { brushAlgo }: UtilsSettings): Path2D | undefined => {
  if (!isUnscaledBrush(brush) || brushAlgo === 'quadratic' || brush.points[brush.points.length - 1]!.length < 2) return undefined
  const path = new Path2D(brush.path)
  path.lineTo(...point)
  return path
}

export const createBrushPath = (brush: DrawableShape<'brush'>, { brushAlgo }: UtilsSettings): Path2D => {
  const path = new Path2D()

  if (brush.points.length < 1) return path

  const scale = getBrushPointScaler(brush)

  for (const points of brush.points) {
    if (!points.length) continue
    if (points.length === 1) {
      path.rect(...scale(points[0]!), 1, 1)
    } else {
      path.moveTo(...scale(points[0]!))
      switch (brushAlgo) {
        case 'quadratic': {
          // each inner point controls a curve ending in the middle of the next segment, the last curve ends at the last point
          let scaledPoint = scale(points[1]!)
          for (let i = 1; i < points.length - 2; i++) {
            const scaledPoint2 = scale(points[i + 1]!)
            const xc = (scaledPoint[0] + scaledPoint2[0]) / 2
            const yc = (scaledPoint[1] + scaledPoint2[1]) / 2
            path.quadraticCurveTo(...scaledPoint, xc, yc)
            scaledPoint = scaledPoint2
          }
          path.quadraticCurveTo(...scale(points[points.length - 2]!), ...scale(points[points.length - 1]!))
          break
        }
        default:
          for (let i = 1; i < points.length; i++) {
            path.lineTo(...scale(points[i]!))
          }
          break
      }
    }
  }

  return path
}

/** A cubic Bezier segment: its start, its two control points and its end */
export type BezierSegment = [Point, Point, Point, Point]

/** Point of a cubic Bezier segment B(t) = (1-t)³P0 + 3(1-t)²t P1 + 3(1-t)t² P2 + t³ P3 */
export const getPointOfSegment = ([p0, p1, p2, p3]: BezierSegment, t: number): Point => {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]
}

/** Bounding box of a cubic Bezier segment */
export const getCubicBezierBounds = (p0: Point, p1: Point, p2: Point, p3: Point): Bounds => {
  const evalX = (t: number) => getPointOfSegment([p0, p1, p2, p3], t)[0]
  const evalY = (t: number) => getPointOfSegment([p0, p1, p2, p3], t)[1]

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

const getCatmullRomPoints = (curve: DrawableShape<'curve'>, points: Point[]) => {
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

const catmullRomToBezier = (p0: Point, p1: Point, p2: Point, p3: Point): { cp1: Point; cp2: Point } => {
  // Conversion Catmull-Rom -> Bezier
  const cp1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const cp2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]

  return { cp1, cp2 }
}

/** Points of a polygon or a curve as drawn: with the point following the cursor while it is drawn */
export const getDrawnPoints = (shape: DrawableShape<'polygon' | 'curve'>): Point[] =>
  shape.tempPoint ? [...shape.points, shape.tempPoint] : shape.points

/** Whether a polygon or a curve with these points is drawn closed: it needs 3 points */
export const isClosedPath = (shape: DrawableShape<'polygon' | 'curve'>, points: readonly Point[]) =>
  points.length > 2 && shape.style?.closedPoints === 1

/** Segments of a curve from the Catmull-Rom spline through its points: none for a single point, a straight one for two */
export const getCurveSegments = (curve: DrawableShape<'curve'>, points: Point[]): BezierSegment[] => {
  const pts = getCatmullRomPoints(curve, points)
  const segments: BezierSegment[] = []
  for (let i = 1; i < pts.length - 2; i++) {
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const { cp1, cp2 } = catmullRomToBezier(pts[i - 1]!, p1, p2, pts[i + 2]!)
    segments.push([p1, cp1, cp2, p2])
  }
  return segments
}

export const createCurvePath = (segments: BezierSegment[], isClosed: boolean): Path2D => {
  const path = new Path2D()
  if (!segments.length) return path
  path.moveTo(...segments[0]![0])
  for (const [, cp1, cp2, end] of segments) {
    path.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1])
  }
  if (isClosed) path.closePath()
  return path
}

export const createPolygonPath = (polygon: DrawableShape<'polygon'>, points: readonly Point[] = getDrawnPoints(polygon)): Path2D => {
  const path = new Path2D()

  if (points.length < 2) return path

  const isClosed = isClosedPath(polygon, points)
  const radius = polygon.style?.cornerRadius ?? 0
  if (radius > 0 && points.length > 2) {
    addRoundedPolygon(path, points, radius, isClosed)
    return path
  }

  path.moveTo(...points[0]!)
  for (const point of points.slice(1)) {
    path.lineTo(...point)
  }

  // joined to its first point like its other corners
  if (isClosed) path.closePath()

  return path
}

/**
 * Adds a polygon with rounded corners to the path. The arc of a corner, tangent to its two sides, takes at most half of a
 * side shared with another rounded corner, and all of a side ending at an end of an open polygon, whose ends stay sharp
 */
const addRoundedPolygon = (path: Path2D, points: readonly Point[], radius: number, isClosed: boolean) => {
  const count = points.length
  const at = (index: number) => points[(index + count) % count]!
  // length of the side from the point to the next one available to the arc of one of its ends
  const getRoom = (index: number) => {
    const length = getDistanceBetweenPoints(at(index), at(index + 1))
    return !isClosed && (index === 0 || index === count - 2) ? length : length / 2
  }

  path.moveTo(...(isClosed ? getCenter(at(-1), at(0)) : at(0)))
  const [start, end] = isClosed ? [0, count] : [1, count - 1]
  for (let index = start; index < end; index++) {
    const [x, y] = at(index)
    const [previousX, previousY] = at(index - 1)
    const [nextX, nextY] = at(index + 1)
    // angle between the two sides, 0 for a side of no length: the corner is then sharp
    const angle = Math.abs(
      Math.atan2((previousX - x) * (nextY - y) - (previousY - y) * (nextX - x), (previousX - x) * (nextX - x) + (previousY - y) * (nextY - y))
    )
    // the arc touches the sides at radius / tan(angle / 2) from the corner
    const maxRadius = Math.min(getRoom(index - 1), getRoom(index)) * Math.tan(angle / 2)
    path.arcTo(x, y, nextX, nextY, Math.min(radius, maxRadius))
  }
  if (isClosed) path.closePath()
  else path.lineTo(...at(-1))
}

/** Grows a rect by a margin on each side, the vertical one being the horizontal one by default */
export const expandRect = (rect: Rect, margin: number, marginY = margin): Rect => {
  return {
    x: rect.x - margin,
    y: rect.y - marginY,
    width: rect.width + margin * 2,
    height: rect.height + marginY * 2
  }
}

/**
 * How far the stroke of a shape goes beyond its path: by the half of its width, further at the corners of its square caps.
 * The miter joins of the right angles of a rectangle stay within it
 */
export const getStrokeMargin = (shape: Pick<DrawableShape, 'style'>, lineWidth = shape.style?.lineWidth ?? 0): number =>
  (lineWidth / 2) * (shape.style?.lineCap === 'square' ? Math.SQRT2 : 1)

export const getDefaultOuterBorder = (shape: DrawableShape, border: Rect) => expandRect(border, getStrokeMargin(shape))

/** Outer borders of a shape with sharp angles: its miter joins go as far as the miter limit */
export const getSharpOuterBorder = (shape: DrawableShape, border: Rect) =>
  shape.style?.lineJoin === 'miter' ? expandRect(border, ((shape.style.lineWidth ?? 0) / 2) * MITER_LIMIT) : getDefaultOuterBorder(shape, border)

const getBoundingBox = (outerBorders: Rect, center: Point, rotation = 0) => {
  if (rotation === 0) return outerBorders
  const rotatedPoints = getRectCorners(outerBorders).map(point =>
    rotatePoint({
      point,
      origin: center,
      rotation
    })
  )

  const { minX, minY, maxX, maxY } = getPointsBounds([rotatedPoints])

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
