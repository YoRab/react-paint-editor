import type { UtilsSettings } from '@canvas/constants/app'
import type { LaserPoint } from '@canvas/store/types'
import type { Point } from '@canvas/types/Shapes'
import { transformCanvas, updateCanvasContext } from '@canvas/utils/canvas'
import { forEachQuadraticCurve } from '@canvas/utils/shapes/path'

/** Time a point of the laser trail takes to fade out */
export const LASER_DURATION_MS = 1000

/** Look of the trail: its width is the one of its newest point, in pixels of the screen */
export type LaserStyle = { color: string; width: number }

const toPoint = ({ point }: LaserPoint) => point

/**
 * The strokes without their faded points. The last point of the trail is kept: the pointer may be held still on it,
 * and the trail goes on from there
 */
export const pruneLaserTrail = (trail: LaserPoint[][], now: number): LaserPoint[][] => {
  const lastStroke = trail.at(-1)
  return trail.flatMap(stroke => {
    const kept = stroke.filter(
      (laserPoint, index) => now - laserPoint.time < LASER_DURATION_MS || (stroke === lastStroke && index === stroke.length - 1)
    )
    return kept.length ? [kept] : []
  })
}

/** The trail with the point, starting a new stroke or going on with the last one */
export const addLaserTrailPoint = (trail: LaserPoint[][], point: Point, now: number, isNewStroke: boolean): LaserPoint[][] => {
  const pruned = pruneLaserTrail(trail, now)
  const laserPoint = { point, time: now }
  return isNewStroke ? [...pruned, [laserPoint]] : [...pruned.slice(0, -1), [...(pruned.at(-1) ?? []), laserPoint]]
}

/**
 * Draws the trail, smoothed like a 'quadratic' brush: each of its curves is as wide as the age of the point controlling
 * it allows. The curves are opaque, so that their round caps do not darken where they overlap. While the laser is
 * pressed, its last point is drawn as new.
 * Returns whether some of it is fading out, to be drawn again in the next frame: a point held still does not change
 */
export const drawLaserTrail = (
  ctx: CanvasRenderingContext2D,
  trail: LaserPoint[][],
  settings: UtilsSettings,
  now: number,
  isPressed: boolean,
  { color, width: laserWidth }: LaserStyle
): boolean => {
  const lastStroke = trail.at(-1)
  const getWidth = (laserPoint: LaserPoint, isHeld: boolean) =>
    (laserWidth * Math.max(0, 1 - (isHeld ? 0 : now - laserPoint.time) / LASER_DURATION_MS)) / settings.canvasSize.scaleRatio
  let isFading = false

  transformCanvas(ctx, settings)
  updateCanvasContext(ctx, { strokeColor: color, fillColor: color })
  for (const stroke of trail) {
    if (stroke.length > 1) {
      forEachQuadraticCurve(stroke, toPoint, (start, control, end, controlIndex) => {
        const width = getWidth(stroke[controlIndex]!, false)
        if (width <= 0) return
        isFading = true
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(...start)
        ctx.quadraticCurveTo(...control, ...end)
        ctx.stroke()
      })
    }
    // a single point, or the one where the pointer is held, is a dot
    const isHeld = isPressed && stroke === lastStroke
    const last = stroke.at(-1)!
    const width = getWidth(last, isHeld)
    if ((stroke.length === 1 || isHeld) && width > 0) {
      isFading ||= !isHeld
      ctx.beginPath()
      ctx.arc(last.point[0], last.point[1], width / 2, 0, 2 * Math.PI)
      ctx.fill()
    }
  }
  ctx.restore()
  return isFading
}
