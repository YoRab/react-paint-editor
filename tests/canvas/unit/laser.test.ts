import type { UtilsSettings } from '@canvas/constants/app'
import type { LaserPoint } from '@canvas/store/types'
import { addLaserTrailPoint, drawLaserTrail, LASER_DURATION_MS, pruneLaserTrail } from '@canvas/utils/laser'
import { describe, expect, it, vi } from 'vitest'

const at = (x: number, time: number): LaserPoint => ({ point: [x, 0], time })

describe('laser trail', () => {
  const trail = [
    [at(0, 0), at(1, 500)],
    [at(2, 900), at(3, 1200)]
  ]

  it('drops the faded points and the empty strokes, but keeps the last point of the trail', () => {
    expect(pruneLaserTrail(trail, 1400)).toEqual([[at(1, 500)], [at(2, 900), at(3, 1200)]])
    expect(pruneLaserTrail(trail, 1950)).toEqual([[at(3, 1200)]])
    // the pointer may be held on it
    expect(pruneLaserTrail(trail, 5000)).toEqual([[at(3, 1200)]])
    expect(pruneLaserTrail([], 5000)).toEqual([])
  })

  it('starts a stroke, or goes on with the last one', () => {
    expect(addLaserTrailPoint(trail, [4, 0], 1400, true)).toEqual([[at(1, 500)], [at(2, 900), at(3, 1200)], [{ point: [4, 0], time: 1400 }]])
    expect(addLaserTrailPoint(trail, [4, 0], 1400, false)).toEqual([[at(1, 500)], [at(2, 900), at(3, 1200), { point: [4, 0], time: 1400 }]])
    expect(addLaserTrailPoint([], [4, 0], 1400, false)).toEqual([[{ point: [4, 0], time: 1400 }]])
  })
})

describe('drawLaserTrail', () => {
  const settings = { canvasSize: { scaleRatio: 2 }, canvasOffset: [0, 0] } as unknown as UtilsSettings

  const STYLE = { color: 'red', width: 6 }

  /** A context recording each curve with its width, and the radius of each dot */
  const createLaserContext = () => {
    const widths: number[] = []
    const radiuses: number[] = []
    const curves: number[][] = []
    const ctx = {
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn((x: number, y: number) => curves.push([x, y])),
      quadraticCurveTo: vi.fn((...args: number[]) => curves.at(-1)!.push(...args)),
      stroke: vi.fn(() => widths.push(ctx.lineWidth)),
      arc: vi.fn((_x: number, _y: number, radius: number) => radiuses.push(radius)),
      fill: vi.fn()
    }
    return { ctx, widths, radiuses, curves }
  }

  it('smooths the strokes like a quadratic brush, each curve narrowed with the age of the point controlling it', () => {
    const { ctx, widths, radiuses, curves } = createLaserContext()
    const isFading = drawLaserTrail(
      ctx as unknown as CanvasRenderingContext2D,
      [[at(0, 0), at(1, 500), at(2, 750), at(3, 1000)]],
      settings,
      1000,
      false,
      STYLE
    )
    expect(isFading).toBe(true)
    // from the start to the middle of the next segment, then to the end, controlled by the inner points
    expect(curves).toEqual([
      [0, 0, 1, 0, 1.5, 0],
      [1.5, 0, 2, 0, 3, 0]
    ])
    // 6 pixels when new, at the scale 2
    expect(widths).toEqual([1.5, 2.25])
    expect(ctx.strokeStyle).toBe('red')
    expect(ctx.fillStyle).toBe('red')
    expect(radiuses).toEqual([])
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  it('draws a stroke of two points as their segment, as wide as the given width at the age of the first one', () => {
    const { ctx, widths, curves } = createLaserContext()
    drawLaserTrail(ctx as unknown as CanvasRenderingContext2D, [[at(0, 750), at(4, 900)]], settings, 1000, false, { color: 'blue', width: 12 })
    expect(curves).toEqual([[0, 0, 0, 0, 4, 0]])
    expect(widths).toEqual([4.5])
    expect(ctx.strokeStyle).toBe('blue')
    // a faded point controls no curve, and is not drawn again
    const faded = createLaserContext()
    expect(drawLaserTrail(faded.ctx as unknown as CanvasRenderingContext2D, [[at(0, 0), at(4, 900)]], settings, 1000, false, STYLE)).toBe(false)
    expect(faded.widths).toEqual([])
  })

  it('draws a single point as a dot, and the held point as a new one, which does not fade while it is held', () => {
    const { ctx, radiuses } = createLaserContext()
    expect(drawLaserTrail(ctx as unknown as CanvasRenderingContext2D, [[at(0, 500)], [at(1, 0), at(2, 200)]], settings, 1000, true, STYLE)).toBe(true)
    expect(radiuses).toEqual([0.75, 1.5])
    const held = createLaserContext()
    const isFading = drawLaserTrail(held.ctx as unknown as CanvasRenderingContext2D, [[at(1, 0), at(2, 200)]], settings, 5000, true, STYLE)
    expect(isFading).toBe(false)
    expect(held.radiuses).toEqual([1.5])
    // released, it fades out until its end
    expect(drawLaserTrail(held.ctx as unknown as CanvasRenderingContext2D, [[at(2, 200)]], settings, 200 + LASER_DURATION_MS - 1, false, STYLE)).toBe(
      true
    )
    expect(drawLaserTrail(held.ctx as unknown as CanvasRenderingContext2D, [[at(2, 200)]], settings, 200 + LASER_DURATION_MS, false, STYLE)).toBe(
      false
    )
  })
})
