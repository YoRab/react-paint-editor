import { updateCanvasContext } from '@canvas/utils/canvas'
import { describe, expect, it, vi } from 'vitest'

const createContext = () => ({ setLineDash: vi.fn() }) as unknown as CanvasRenderingContext2D & { setLineDash: ReturnType<typeof vi.fn> }

describe('updateCanvasContext', () => {
  it('draws solid strokes with round joins and caps by default', () => {
    const ctx = createContext()
    updateCanvasContext(ctx, {})
    expect(ctx).toMatchObject({ lineJoin: 'round', lineCap: 'round' })
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })

  it('gives the joins and the caps of the style', () => {
    const ctx = createContext()
    updateCanvasContext(ctx, { lineJoin: 'miter', lineCap: 'square' })
    expect(ctx).toMatchObject({ lineJoin: 'miter', lineCap: 'square' })
  })

  it('scales the whole pattern of the dashes with the width of the stroke', () => {
    const ctx = createContext()
    updateCanvasContext(ctx, { lineDash: 1, lineWidth: 2 })
    expect(ctx.setLineDash).toHaveBeenLastCalledWith([2, 4])
    updateCanvasContext(ctx, { lineDash: 3, lineWidth: 2 })
    expect(ctx.setLineDash).toHaveBeenLastCalledWith([16, 12])
    updateCanvasContext(ctx, { lineDash: 4, lineWidth: 3 })
    expect(ctx.setLineDash).toHaveBeenLastCalledWith([12, 12, 3, 12])
  })

  it('draws a solid stroke for an unknown pattern', () => {
    const ctx = createContext()
    updateCanvasContext(ctx, { lineDash: 9, lineWidth: 2 })
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })
})
