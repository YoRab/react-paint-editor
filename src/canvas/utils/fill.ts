import { STYLE_FILL_COLOR2_DEFAULT, STYLE_FILL_GRADIENT_ANGLE_DEFAULT } from '@canvas/constants/rendering'
import { SELECTION_DEFAULT_WIDTH } from '@canvas/constants/shapes'
import type { FillGradient, FillPattern, Rect, ShapeEntity, StyleShape } from '@canvas/types/Shapes'
import { createDetachedContext, isVisibleColor } from '@canvas/utils/canvas'
import { degreesToRadians } from '@canvas/utils/trigo'
import { clamp } from '@canvas/utils/util'

type FillStyle = Pick<StyleShape, 'fillColor' | 'fillPattern' | 'fillGradient' | 'fillColor2' | 'fillGradientAngle' | 'lineWidth'>

const GRADIENTS = ['linear', 'radial', 'conic'] as const satisfies readonly FillGradient[]
const PATTERNS = ['hatch', 'crossHatch', 'dots'] as const satisfies readonly FillPattern[]

/** The gradient of a fill, undefined for none or an unknown one */
export const getFillGradient = (style: FillStyle | undefined) => GRADIENTS.find(gradient => gradient === style?.fillGradient)

/** The pattern of a fill, undefined for a solid or an unknown one */
export const getFillPattern = (style: FillStyle | undefined) => PATTERNS.find(pattern => pattern === style?.fillPattern)

/** Whether the gradient of a fill is masked by its dots: the shape is then drawn on its own layer, whatever its opacity */
export const isFillMasked = (style: FillStyle | undefined) => getFillPattern(style) === 'dots' && getFillGradient(style) !== undefined

/** Whether a shape is filled: with its fill color, or with the second color of its gradient */
export const hasVisibleFill = (style: FillStyle | undefined): boolean =>
  isVisibleColor(style?.fillColor) || (getFillGradient(style) !== undefined && isVisibleColor(style?.fillColor2 ?? STYLE_FILL_COLOR2_DEFAULT))

/**
 * The color of a gradient stop next to a transparent one: the colors of a canvas gradient are interpolated with their
 * opacity, so a transparent stop is the other color without opacity, instead of a transparent black darkening the fade
 */
const getTransparentStop = (ctx: CanvasRenderingContext2D, color: string): string => {
  ctx.fillStyle = color
  // the context gives a color back as #rrggbb when opaque, as rgba(r, g, b, a) otherwise
  const parsed = ctx.fillStyle
  if (typeof parsed !== 'string') return 'transparent'
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(parsed)
  if (hex) return `rgba(${hex.slice(1).map(channel => Number.parseInt(channel, 16))}, 0)`
  return parsed.replace(/^rgba\((.+),[^,]+\)$/, 'rgba($1, 0)')
}

/** Box of a shape (its borders) and its center */
type FillBox = Pick<ShapeEntity['computed'], 'borders' | 'center'>

/** Gradient of the fill of a shape in its box, from its fill color. Undefined when a color cannot be read */
const createFillGradient = (
  ctx: CanvasRenderingContext2D,
  style: FillStyle,
  from: string,
  gradientType: FillGradient,
  { borders: box, center: [centerX, centerY] }: FillBox
): CanvasGradient | undefined => {
  const angle = degreesToRadians(style.fillGradientAngle ?? STYLE_FILL_GRADIENT_ANGLE_DEFAULT)
  let gradient: CanvasGradient
  if (gradientType === 'radial') {
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(box.width, box.height) / 2)
  } else if (gradientType === 'conic') {
    gradient = ctx.createConicGradient(angle, centerX, centerY)
  } else {
    // like in CSS, the colors are at the corners of the box across the angle
    const halfLength = (Math.abs(box.width * Math.cos(angle)) + Math.abs(box.height * Math.sin(angle))) / 2
    const deltaX = Math.cos(angle) * halfLength
    const deltaY = Math.sin(angle) * halfLength
    gradient = ctx.createLinearGradient(centerX - deltaX, centerY - deltaY, centerX + deltaX, centerY + deltaY)
  }
  const to = style.fillColor2 ?? STYLE_FILL_COLOR2_DEFAULT
  try {
    gradient.addColorStop(0, isVisibleColor(from) ? from : getTransparentStop(ctx, to))
    gradient.addColorStop(1, isVisibleColor(to) ? to : getTransparentStop(ctx, from))
  } catch {
    return undefined
  }
  return gradient
}

/** Thickness of the lines of a pattern, radius of its dots, and gap between them, growing with the width of the stroke */
type PatternSize = { thickness: number; gap: number }

const getPatternSize = (style: FillStyle): PatternSize => {
  const lineWidth = style.lineWidth ?? SELECTION_DEFAULT_WIDTH
  return { thickness: Math.max(1, lineWidth / 2), gap: Math.max(8, lineWidth * 4) }
}

/** Lines at 45° covering the box, a gap apart, from the top of the box to its bottom, and the ones across them for a cross-hatch */
const createHatchPath = (pattern: 'hatch' | 'crossHatch', box: Rect, gap: number): Path2D => {
  const path = new Path2D()
  const right = box.x + box.width
  const bottom = box.y + box.height
  const step = gap * Math.SQRT2
  for (let offset = step / 2; offset < box.width + box.height; offset += step) {
    path.moveTo(box.x + offset, box.y)
    path.lineTo(box.x + offset - box.height, bottom)
    if (pattern === 'crossHatch') {
      path.moveTo(right - offset, box.y)
      path.lineTo(right - offset + box.height, bottom)
    }
  }
  return path
}

/** Largest tile of the dots, in pixels: the dots of a larger gap on the screen are scaled up */
const DOTS_TILE_MAX_SIZE = 1024

/** Tiles of the dots by color and size, reused by the next drawings: null outside of a browser */
const dotsTiles = new Map<string, HTMLCanvasElement | null>()

const getDotsTile = (color: string, size: number, radius: number): HTMLCanvasElement | null => {
  const key = `${color}|${size}|${radius}`
  let tile = dotsTiles.get(key)
  if (tile === undefined) {
    const tileCtx = createDetachedContext()
    tile = tileCtx?.canvas ?? null
    if (tileCtx) {
      tileCtx.canvas.width = size
      tileCtx.canvas.height = size
      tileCtx.fillStyle = color
      tileCtx.arc(size / 2, size / 2, radius, 0, 2 * Math.PI)
      tileCtx.fill()
    }
    // the least recently used tile is dropped
    if (dotsTiles.size >= 32) dotsTiles.delete(dotsTiles.keys().next().value!)
  } else {
    dotsTiles.delete(key)
  }
  dotsTiles.set(key, tile)
  return tile
}

/**
 * Dots a gap apart from the corner of the box, repeated from a tile drawn at the resolution of the canvas: much faster
 * than drawing each dot, they stay sharp when zoomed
 */
const createDotsPattern = (ctx: CanvasRenderingContext2D, color: string, box: Rect, { thickness, gap }: PatternSize): CanvasPattern | null => {
  const { a, b, c, d } = ctx.getTransform()
  const tileSize = clamp(Math.round(gap * Math.sqrt(Math.abs(a * d - b * c))), 2, DOTS_TILE_MAX_SIZE)
  const tile = getDotsTile(color, tileSize, (thickness * tileSize) / gap)
  const pattern = tile && ctx.createPattern(tile, 'repeat')
  const scale = gap / tileSize
  pattern?.setTransform({ a: scale, b: 0, c: 0, d: scale, e: box.x, f: box.y })
  return pattern
}

/**
 * Fills the path of a shape, in its box: with its fill color or its gradient, or with its pattern of this color. The
 * lines of a hatch are clipped by the path, and not dashed like the stroke. The gradient of dots is masked by them: the
 * shape is drawn on its own layer (isFillMasked)
 */
const drawFill = (ctx: CanvasRenderingContext2D, path: Path2D, style: FillStyle, fillBox: FillBox): void => {
  const color = style.fillColor ?? 'transparent'
  const gradientType = getFillGradient(style)
  const gradient = gradientType && createFillGradient(ctx, style, color, gradientType, fillBox)
  const pattern = getFillPattern(style)
  if (!pattern) {
    ctx.fillStyle = gradient ?? color
    ctx.fill(path)
    return
  }
  const size = getPatternSize(style)
  if (pattern === 'dots') {
    const dots = createDotsPattern(ctx, gradient ? 'black' : color, fillBox.borders, size)
    if (!dots) return
    ctx.fillStyle = dots
    ctx.fill(path)
    if (gradient) {
      ctx.save()
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = gradient
      ctx.fill(path)
      ctx.restore()
    }
    return
  }
  ctx.save()
  ctx.clip(path)
  ctx.strokeStyle = gradient ?? color
  ctx.lineWidth = size.thickness
  ctx.setLineDash([])
  ctx.stroke(createHatchPath(pattern, fillBox.borders, size.gap))
  ctx.restore()
}

export const drawPathWithFillAndStroke = (ctx: CanvasRenderingContext2D, shape: Pick<ShapeEntity, 'path' | 'style' | 'computed'>): void => {
  if (ctx.globalAlpha === 0) return

  if (hasVisibleFill(shape.style)) {
    drawFill(ctx, shape.path, shape.style ?? {}, shape.computed)
  }
  if (shape.style?.strokeColor !== 'transparent') {
    ctx.stroke(shape.path)
  }
}
