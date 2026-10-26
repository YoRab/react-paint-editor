import type { UtilsSettings } from '@canvas/constants/app'
import { STYLE_ARROW_SIZE_DEFAULT } from '@canvas/constants/rendering'
import type { ArrowHead, ArrowHeadEntity, DrawableShape, Point, Rect, StyleShape } from '@canvas/types/Shapes'
import { type BezierSegment, getPointOfSegment, getSharpOuterBorder } from '@canvas/utils/shapes/path'
import { getBoundingRect, getDistanceBetweenPoints, getPointsBounds } from '@canvas/utils/trigo'

/** Heads of the ends of a stroke as drawn, with the bounds of their paths, undefined without head */
export type ArrowHeads = {
  arrows: ArrowHeadEntity[]
  bounds: Rect | undefined
}

type DrawnArrowHead = Exclude<ArrowHead, 'none'>

/** Outline made of segments, as [distance behind the tip, distance at the side of the stroke] in units of the heads */
type SegmentsOutline = { points: Point[]; isClosed: boolean }

const TRIANGLE: SegmentsOutline = {
  points: [
    [0, 0],
    [2, 1],
    [2, -1]
  ],
  isClosed: true
}

const DIAMOND: SegmentsOutline = {
  points: [
    [0, 0],
    [1, 1],
    [2, 0],
    [1, -1]
  ],
  isClosed: true
}

const CIRCLE = { radius: 0.75 }

/**
 * Each head: its outline, made of segments or a circle centered on the tip, whether it is filled, and its depth, the
 * distance from its tip to where the stroke stops. It is the middle of the back of the head, so that the caps of the
 * stroke stay under it, out of the hole of an outlined head. The stroke goes to the tip of an open head and to a bar. The
 * sizes are in units of the heads: a triangle is as long and as wide as the heads of the lines were
 */
const ARROW_HEADS: Record<DrawnArrowHead, { outline: SegmentsOutline | typeof CIRCLE; filled: boolean; depth: number }> = {
  triangle: { outline: TRIANGLE, filled: true, depth: 2 },
  triangleOutline: { outline: TRIANGLE, filled: false, depth: 2 },
  open: {
    outline: {
      points: [
        [2, 1],
        [0, 0],
        [2, -1]
      ],
      isClosed: false
    },
    filled: false,
    depth: 0
  },
  circle: { outline: CIRCLE, filled: true, depth: CIRCLE.radius },
  circleOutline: { outline: CIRCLE, filled: false, depth: CIRCLE.radius },
  diamond: { outline: DIAMOND, filled: true, depth: 2 },
  diamondOutline: { outline: DIAMOND, filled: false, depth: 2 },
  bar: {
    outline: {
      points: [
        [0, 1],
        [0, -1]
      ],
      isClosed: false
    },
    filled: false,
    depth: 0
  }
}

/** Length of the heads from their tip, in units of the heads: the direction of a curved end is taken along it */
const HEAD_LENGTH = 2

const NO_DASH: number[] = []

/** Head of an end of the stroke, undefined for none or for an unknown head */
const getArrowHead = (style: StyleShape | undefined, end: 'start' | 'end'): DrawnArrowHead | undefined => {
  const head = end === 'start' ? style?.arrowStart : style?.arrowEnd
  return head !== undefined && Object.hasOwn(ARROW_HEADS, head) ? (head as DrawnArrowHead) : undefined
}

/** Unit of the size of the heads, half of the width of a triangle: it grows with the width of the stroke */
const getArrowHeadUnit = (style: StyleShape | undefined) => {
  const size = style?.arrowSize ?? STYLE_ARROW_SIZE_DEFAULT
  return (5 + (style?.lineWidth ?? 0)) * (size > 0 ? size : STYLE_ARROW_SIZE_DEFAULT)
}

/** Heads of a stroke being built, with the points of their outlines, which give their bounds */
const createArrowHeads = (unit: number) => {
  const arrows: ArrowHeadEntity[] = []
  const outlinePoints: Point[] = []
  return {
    /** Adds a head at the tip, pointing away from the point: gives its direction, undefined at no distance from the tip */
    add: (head: DrawnArrowHead, tip: Point, from: Point): Point | undefined => {
      const length = getDistanceBetweenPoints(tip, from)
      if (!length) return undefined
      const dx = (tip[0] - from[0]) / length
      const dy = (tip[1] - from[1]) / length
      const { outline, filled } = ARROW_HEADS[head]
      const path = new Path2D()
      if ('radius' in outline) {
        const radius = outline.radius * unit
        path.arc(tip[0], tip[1], radius, 0, 2 * Math.PI)
        outlinePoints.push([tip[0] - radius, tip[1] - radius], [tip[0] + radius, tip[1] + radius])
      } else {
        const points = outline.points.map(([back, side]): Point => [tip[0] - (back * dx + side * dy) * unit, tip[1] - (back * dy - side * dx) * unit])
        path.moveTo(...points[0]!)
        for (const point of points.slice(1)) path.lineTo(...point)
        if (outline.isClosed) path.closePath()
        outlinePoints.push(...points)
      }
      arrows.push({ path, filled })
      return [dx, dy]
    },
    getHeads: (): ArrowHeads => {
      if (!arrows.length) return { arrows, bounds: undefined }
      const { minX, minY, maxX, maxY } = getPointsBounds([outlinePoints])
      return { arrows, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } }
    }
  }
}

/**
 * Heads of the ends of a stroke of straight segments, pointing along its first and its last segments, none when it is
 * closed. Each end is moved back to where the stroke stops under its head, at most to the next point
 */
export const addStraightArrowHeads = (
  style: StyleShape | undefined,
  points: readonly Point[],
  isClosed = false
): ArrowHeads & { points: readonly Point[] } => {
  const startHead = isClosed ? undefined : getArrowHead(style, 'start')
  const endHead = isClosed ? undefined : getArrowHead(style, 'end')
  if (!startHead && !endHead) return { points, arrows: [], bounds: undefined }
  const unit = getArrowHeadUnit(style)
  const heads = createArrowHeads(unit)
  const strokePoints = [...points]
  const addHead = (head: DrawnArrowHead | undefined, index: number, nextIndex: number) => {
    const tip = points[index]
    const next = points[nextIndex]
    if (!head || !tip || !next) return
    const direction = heads.add(head, tip, next)
    if (!direction) return
    const depth = Math.min(ARROW_HEADS[head].depth * unit, getDistanceBetweenPoints(tip, next))
    strokePoints[index] = [tip[0] - direction[0] * depth, tip[1] - direction[1] * depth]
  }
  addHead(startHead, 0, 1)
  addHead(endHead, points.length - 1, points.length - 2)
  return { points: strokePoints, ...heads.getHeads() }
}

/** Parameter of the point of a segment at the distance from its start, found by bisection: 1 when its end is closer */
const getParameterAtDistance = (segment: BezierSegment, distance: number): number => {
  if (distance <= 0) return 0
  if (getDistanceBetweenPoints(segment[0], segment[3]) <= distance) return 1
  let low = 0
  let high = 1
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2
    if (getDistanceBetweenPoints(segment[0], getPointOfSegment(segment, middle)) < distance) low = middle
    else high = middle
  }
  return high
}

/** The part of a segment after the parameter, from de Casteljau's algorithm */
const getSegmentEnd = ([p0, p1, p2, p3]: BezierSegment, t: number): BezierSegment => {
  const lerp = (a: Point, b: Point): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const p12 = lerp(p1, p2)
  const p123 = lerp(p12, lerp(p2, p3))
  return [lerp(lerp(lerp(p0, p1), p12), p123), p123, lerp(p2, p3), p3]
}

const reverseSegment = ([p0, p1, p2, p3]: BezierSegment): BezierSegment => [p3, p2, p1, p0]

/** The part of a segment between the parameters, a point at the first one when they cross */
const getSegmentPart = (segment: BezierSegment, from: number, to: number): BezierSegment => {
  const end = from > 0 ? getSegmentEnd(segment, from) : segment
  if (to >= 1) return end
  // the parameter on the end part
  const t = from < to ? (to - from) / (1 - from) : 0
  return reverseSegment(getSegmentEnd(reverseSegment(end), 1 - t))
}

/**
 * Heads of the ends of a curve made of segments, none when it is closed. A head points along the line from the point of
 * the curve at its length from the tip, so that a curved end goes into the middle of its back, and the curve is cut where
 * it stops under the head
 */
export const addCurveArrowHeads = (
  style: StyleShape | undefined,
  segments: BezierSegment[],
  isClosed: boolean
): ArrowHeads & { segments: BezierSegment[] } => {
  const startHead = isClosed ? undefined : getArrowHead(style, 'start')
  const endHead = isClosed ? undefined : getArrowHead(style, 'end')
  const first = segments[0]
  const last = segments[segments.length - 1]
  if ((!startHead && !endHead) || !first || !last) return { segments, arrows: [], bounds: undefined }
  const unit = getArrowHeadUnit(style)
  const heads = createArrowHeads(unit)
  // parameter of the segment, starting at the tip, where the stroke stops under the head
  const getCut = (head: DrawnArrowHead | undefined, segment: BezierSegment): number => {
    if (!head) return 0
    const directionParameter = getParameterAtDistance(segment, HEAD_LENGTH * unit)
    if (!heads.add(head, segment[0], getPointOfSegment(segment, directionParameter))) return 0
    const { depth } = ARROW_HEADS[head]
    return depth === HEAD_LENGTH ? directionParameter : getParameterAtDistance(segment, depth * unit)
  }
  const from = getCut(startHead, first)
  const to = 1 - getCut(endHead, reverseSegment(last))
  const strokeSegments = [...segments]
  if (segments.length === 1) {
    strokeSegments[0] = getSegmentPart(first, from, to)
  } else {
    strokeSegments[0] = getSegmentPart(first, from, 1)
    strokeSegments[segments.length - 1] = getSegmentPart(last, 0, to)
  }
  return { segments: strokeSegments, ...heads.getHeads() }
}

/** The function giving the outer borders of a shape, which then also hold its heads with their stroke */
export const withArrowHeadsOuterBorder =
  <T extends DrawableShape, U extends Pick<UtilsSettings, 'selectionPadding'>>(
    getOuterBorder: (shape: T, borders: Rect, settings: U) => Rect,
    bounds: Rect | undefined
  ) =>
  (shape: T, borders: Rect, settings: U): Rect => {
    const outerBorders = getOuterBorder(shape, borders, settings)
    return bounds ? getBoundingRect([outerBorders, getSharpOuterBorder(shape, bounds)]) : outerBorders
  }

/** Draws the heads of a shape with the color of its stroke, without its dashes */
export const drawArrowHeads = (ctx: CanvasRenderingContext2D, arrows: ArrowHeadEntity[] | undefined): void => {
  if (!arrows?.length) return
  ctx.setLineDash(NO_DASH)
  ctx.fillStyle = ctx.strokeStyle
  for (const { path, filled } of arrows) {
    if (filled) ctx.fill(path)
    else ctx.stroke(path)
  }
}
