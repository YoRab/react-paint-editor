import type { ShapeEntity, StyleShape } from '@canvas/types/Shapes'
import { drawPathWithFillAndStroke, getFillGradient, getFillPattern, hasVisibleFill, isFillMasked } from '@canvas/utils/fill'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubPath2D } from './helpers'

stubPath2D()

afterEach(() => {
  vi.restoreAllMocks()
})

/** Colors as the context gives them back: #rrggbb when opaque, rgba(r, g, b, a) otherwise */
const PARSED_COLORS: Record<string, string> = {
  red: '#ff0000',
  blue: '#0000ff',
  transparent: 'rgba(0, 0, 0, 0)',
  'rgba(0, 128, 0, 0.5)': 'rgba(0, 128, 0, 0.5)'
}

/** A context recording the operations of the drawing and the gradients and patterns it creates, at a scale */
const createFillContext = (scale = 1) => {
  const calls: string[] = []
  const gradient = { addColorStop: vi.fn() }
  const pattern = { setTransform: vi.fn() }
  const record = (name: string) => vi.fn((..._args: unknown[]) => calls.push(name))
  let fillStyle: unknown = ''
  const ctx = {
    globalAlpha: 1,
    strokeStyle: 'black',
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
    getTransform: () => ({ a: scale, b: 0, c: 0, d: scale }),
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: unknown) {
      // an invalid color is ignored
      if (typeof value !== 'string') fillStyle = value
      else if (PARSED_COLORS[value]) fillStyle = PARSED_COLORS[value]
    },
    save: record('save'),
    restore: record('restore'),
    clip: record('clip'),
    fill: record('fill'),
    stroke: record('stroke'),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    createConicGradient: vi.fn(() => gradient),
    createPattern: vi.fn(() => pattern)
  }
  return { ctx, calls, gradient, pattern }
}

const BOX = { x: 0, y: 0, width: 100, height: 50 }

const draw = (ctx: ReturnType<typeof createFillContext>['ctx'], style: StyleShape, path = new Path2D()) =>
  drawPathWithFillAndStroke(
    ctx as unknown as CanvasRenderingContext2D,
    {
      path,
      style,
      computed: { borders: BOX, center: [50, 25] }
    } as Pick<ShapeEntity, 'path' | 'style' | 'computed'>
  )

describe('fill values', () => {
  it('reads the known patterns and gradients only', () => {
    expect(getFillPattern({ fillPattern: 'dots' })).toBe('dots')
    expect(getFillPattern({ fillPattern: 'solid' })).toBeUndefined()
    expect(getFillPattern({ fillPattern: 'stripes' as never })).toBeUndefined()
    expect(getFillGradient({ fillGradient: 'conic' })).toBe('conic')
    expect(getFillGradient({ fillGradient: 'none' })).toBeUndefined()
    expect(getFillGradient({ fillGradient: 'diamond' as never })).toBeUndefined()
    expect(getFillGradient(undefined)).toBeUndefined()
  })

  it('fills a shape with its fill color, or with the second color of its gradient', () => {
    expect(hasVisibleFill({ fillColor: 'red' })).toBe(true)
    expect(hasVisibleFill({ fillColor: 'transparent' })).toBe(false)
    expect(hasVisibleFill({})).toBe(false)
    expect(hasVisibleFill({ fillColor: 'transparent', fillColor2: 'blue' })).toBe(false)
    expect(hasVisibleFill({ fillColor: 'transparent', fillGradient: 'linear', fillColor2: 'blue' })).toBe(true)
    // white by default
    expect(hasVisibleFill({ fillColor: 'transparent', fillGradient: 'radial' })).toBe(true)
    expect(hasVisibleFill({ fillColor: 'transparent', fillGradient: 'radial', fillColor2: 'transparent' })).toBe(false)
  })
})

describe('drawPathWithFillAndStroke', () => {
  it('fills then strokes the path, like before without pattern nor gradient', () => {
    const { ctx, calls } = createFillContext()
    const path = new Path2D()
    draw(ctx, { fillColor: 'red', strokeColor: 'blue' }, path)
    expect(calls).toEqual(['fill', 'stroke'])
    expect(ctx.fill).toHaveBeenCalledWith(path)
    expect(ctx.fillStyle).toBe('#ff0000')

    const unfilled = createFillContext()
    draw(unfilled.ctx, { fillColor: 'transparent', strokeColor: 'blue' })
    expect(unfilled.calls).toEqual(['stroke'])
  })

  it('draws nothing without opacity', () => {
    const { ctx, calls } = createFillContext()
    ctx.globalAlpha = 0
    draw(ctx, { fillColor: 'red' })
    expect(calls).toEqual([])
  })

  it('draws the lines of a pattern clipped by the path, of the fill color, without the dashes of the stroke', () => {
    const { ctx, calls } = createFillContext()
    const path = new Path2D()
    let patternStyle: unknown[] = []
    ctx.stroke.mockImplementationOnce(() => {
      patternStyle = [ctx.strokeStyle, ctx.lineWidth]
      return calls.push('stroke')
    })
    draw(ctx, { fillColor: 'red', fillPattern: 'hatch', lineWidth: 4, lineDash: 2 }, path)
    expect(calls).toEqual(['save', 'clip', 'stroke', 'restore', 'stroke'])
    expect(ctx.clip).toHaveBeenCalledWith(path)
    expect(ctx.fill).not.toHaveBeenCalled()
    // half as thick as the stroke
    expect(patternStyle).toEqual(['red', 2])
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
    expect(ctx.stroke.mock.calls[1]![0]).toBe(path)
  })

  it('draws lines at 45° a gap apart, 4 widths of the stroke and at least 8, across the box', () => {
    const lines = (style: StyleShape) => {
      const moveTo = vi.spyOn(Path2D.prototype, 'moveTo')
      const lineTo = vi.spyOn(Path2D.prototype, 'lineTo')
      draw(createFillContext().ctx, { fillColor: 'red', ...style })
      const result = moveTo.mock.calls.map((from, index) => [from, lineTo.mock.calls[index]])
      vi.restoreAllMocks()
      return result
    }
    // a gap of 10 between the lines: 10√2 along the sides, the first one half of it from the corner
    const step = 10 * Math.SQRT2
    const hatch = lines({ fillPattern: 'hatch', lineWidth: 2.5 })
    // the box is 100 + 50 long across its diagonal
    expect(hatch).toHaveLength(Math.ceil((150 - step / 2) / step))
    expect(hatch[0]![0]![0]).toBeCloseTo(step / 2)
    expect(hatch[0]![0]![1]).toBe(0)
    expect(hatch[0]![1]![0]).toBeCloseTo(step / 2 - 50)
    expect(hatch[0]![1]![1]).toBe(50)
    expect(hatch[1]![0]![0]).toBeCloseTo(step * 1.5)

    // and the lines across them, from the right side
    const crossHatch = lines({ fillPattern: 'crossHatch', lineWidth: 2.5 })
    expect(crossHatch).toHaveLength(hatch.length * 2)
    expect(crossHatch[1]![0]![0]).toBeCloseTo(100 - step / 2)
    expect(crossHatch[1]![1]![0]).toBeCloseTo(100 - step / 2 + 50)

    // a gap of 8 for a thin stroke
    expect(lines({ fillPattern: 'hatch', lineWidth: 1 })[0]![0]![0]).toBeCloseTo(4 * Math.SQRT2)
  })

  describe('dots', () => {
    type FakeTile = { width: number; height: number; fillStyle: string; arcs: number[][] }
    let tiles: FakeTile[] = []

    // the tiles are drawn on canvases out of the page
    beforeEach(() => {
      tiles = []
      vi.stubGlobal('document', {
        createElement: () => {
          const tile: FakeTile & { getContext: () => unknown } = {
            width: 0,
            height: 0,
            fillStyle: '',
            arcs: [],
            getContext: () => tileCtx
          }
          const tileCtx = {
            canvas: tile,
            set fillStyle(value: string) {
              tile.fillStyle = value
            },
            arc: (...args: number[]) => tile.arcs.push(args),
            fill: () => {}
          }
          tiles.push(tile)
          return tile
        }
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      stubPath2D()
    })

    it('fills dots a gap apart from the corner of the box, repeated from a tile at the resolution of the canvas', () => {
      const { ctx, calls, pattern } = createFillContext(2)
      const path = new Path2D()
      draw(ctx, { fillColor: 'red', fillPattern: 'dots', lineWidth: 4, strokeColor: 'transparent' }, path)
      // a gap of 16 units, 32 pixels at the scale 2, and dots as wide as the stroke
      expect(tiles).toMatchObject([{ width: 32, height: 32, fillStyle: 'red', arcs: [[16, 16, 4, 0, 2 * Math.PI]] }])
      expect(pattern.setTransform).toHaveBeenCalledWith({ a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0 })
      // the pattern stays inside the path without a clip
      expect(calls).toEqual(['fill'])
      expect(ctx.fill).toHaveBeenCalledWith(path)

      // the tile is drawn once
      draw(ctx, { fillColor: 'red', fillPattern: 'dots', lineWidth: 4 })
      expect(tiles).toHaveLength(1)
    })

    it('masks a gradient by the dots', () => {
      const { ctx, gradient } = createFillContext()
      const operations: unknown[] = []
      ctx.fill.mockImplementation(() => operations.push([ctx.fillStyle, ctx.globalCompositeOperation]))
      draw(ctx, { fillColor: 'red', fillPattern: 'dots', fillGradient: 'radial', fillColor2: 'blue' })
      // drawn in black, then colored by the gradient where they are
      expect(tiles).toMatchObject([{ fillStyle: 'black' }])
      expect(operations).toEqual([
        [expect.objectContaining({ setTransform: expect.any(Function) }), 'source-over'],
        [gradient, 'source-in']
      ])
      expect(isFillMasked({ fillPattern: 'dots', fillGradient: 'radial' })).toBe(true)
      expect(isFillMasked({ fillPattern: 'dots' })).toBe(false)
      expect(isFillMasked({ fillPattern: 'hatch', fillGradient: 'radial' })).toBe(false)
    })
  })

  it('fills a linear gradient across the box along its angle, from the fill color to the second one', () => {
    const { ctx, gradient } = createFillContext()
    draw(ctx, { fillColor: 'red', fillGradient: 'linear', fillColor2: 'blue' })
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 25, 100, 25)
    expect(gradient.addColorStop.mock.calls).toEqual([
      [0, 'red'],
      [1, 'blue']
    ])
    expect(ctx.fillStyle).toBe(gradient)

    // from the top to the bottom, then reaching the corners across the diagonal, like in CSS
    draw(ctx, { fillColor: 'red', fillGradient: 'linear', fillGradientAngle: 90 })
    const [x0, y0, x1, y1] = ctx.createLinearGradient.mock.calls[1] as unknown as number[]
    expect([x0, y0, x1, y1].map(value => Math.round(value!) + 0)).toEqual([50, 0, 50, 50])
    expect(gradient.addColorStop).toHaveBeenLastCalledWith(1, 'white')

    draw(ctx, { fillColor: 'red', fillGradient: 'linear', fillGradientAngle: 45 })
    const diagonal = ctx.createLinearGradient.mock.calls[2] as unknown as number[]
    // half of (100 + 50) / √2 on each side of the center, along the diagonal
    expect(diagonal[2]! - 50).toBeCloseTo(37.5)
    expect(diagonal[3]! - 25).toBeCloseTo(37.5)
  })

  it('fills a radial gradient to the farthest side and a conic one from its angle', () => {
    const { ctx } = createFillContext()
    draw(ctx, { fillColor: 'red', fillGradient: 'radial', fillGradientAngle: 90 })
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(50, 25, 0, 50, 25, 50)
    draw(ctx, { fillColor: 'red', fillGradient: 'conic', fillGradientAngle: 90 })
    expect(ctx.createConicGradient).toHaveBeenCalledWith(Math.PI / 2, 50, 25)
  })

  it('fades a color out to a transparent one, instead of going through a transparent black', () => {
    const { ctx, gradient } = createFillContext()
    draw(ctx, { fillColor: 'red', fillGradient: 'linear', fillColor2: 'transparent' })
    expect(gradient.addColorStop.mock.calls).toEqual([
      [0, 'red'],
      [1, 'rgba(255,0,0, 0)']
    ])
    gradient.addColorStop.mockClear()
    draw(ctx, { fillColor: 'transparent', fillGradient: 'radial', fillColor2: 'rgba(0, 128, 0, 0.5)' })
    expect(gradient.addColorStop.mock.calls).toEqual([
      [0, 'rgba(0, 128, 0, 0)'],
      [1, 'rgba(0, 128, 0, 0.5)']
    ])
  })

  it('colors the lines of a pattern with the gradient', () => {
    const { ctx, gradient } = createFillContext()
    let strokeStyle: unknown
    ctx.stroke.mockImplementationOnce(() => {
      strokeStyle = ctx.strokeStyle
      return 0
    })
    draw(ctx, { fillColor: 'red', fillPattern: 'crossHatch', fillGradient: 'conic', fillColor2: 'blue' })
    expect(strokeStyle).toBe(gradient)
  })

  it('fills with the fill color when a color of the gradient is invalid', () => {
    const { ctx, gradient } = createFillContext()
    gradient.addColorStop.mockImplementation(() => {
      throw new SyntaxError('invalid color')
    })
    draw(ctx, { fillColor: 'red', fillGradient: 'linear', fillColor2: 'not a color' })
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillStyle).toBe('#ff0000')
  })
})
