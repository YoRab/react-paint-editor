import { STYLE_FONT_SIZE_DEFAULT } from '@canvas/constants/rendering'
import { DEFAULT_TOOLS } from '@canvas/constants/tools'
import type { DrawableShape, Point, ShapeEntity, StyleShape, TextAlign, TextShapeInput } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { refreshShape } from '@canvas/utils/shapes'
import {
  calculateTextFontSize,
  createText as createTextShape,
  drawText,
  isTextPaintedSeveralTimes,
  resizeTextShapeWithNewContent,
  sizeText
} from '@canvas/utils/shapes/text'
import { rotatePoint } from '@canvas/utils/trigo'
import { describe, expect, it, vi } from 'vitest'
import { createShape, stubPath2D, UTILS_SETTINGS } from './helpers'

stubPath2D()

/** Measures 1 em per character, at the font size set in its font */
const createContext = () => {
  const ctx = {
    font: '',
    measureText: (text: string) => ({ width: text.length * Number.parseFloat(/([\d.]+)px/.exec(ctx.font)?.[1] ?? '0') })
  }
  return ctx as unknown as CanvasRenderingContext2D
}

const createText = (text: Omit<DrawableShape<'text'>, 'type'>) => createShape<ShapeEntity<'text'>>({ type: 'text', ...text })

/** Position of the top left corner of a text on the screen, turned with it around its center */
const getTopLeftOnScreen = (text: ShapeEntity<'text'>): Point =>
  rotatePoint({ origin: text.computed.center, point: [text.x, text.y], rotation: -(text.rotation ?? 0) })

describe('calculateTextFontSize', () => {
  it('gives the font size of the longest line filling the width', () => {
    expect(calculateTextFontSize(createContext(), ['ab', 'abcd'], 100, false, false)).toBe(25)
  })

  it('measures the lines with the font of the text', () => {
    const ctx = createContext()
    calculateTextFontSize(ctx, ['ab'], 100, true, true, 'arial')
    expect(ctx.font).toBe('italic bold 1px arial')
  })

  it('does not limit the font size by an empty line', () => {
    expect(calculateTextFontSize(createContext(), ['', 'ab'], 100, false, false)).toBe(50)
  })

  it('gives the default font size to a text without characters, or without width', () => {
    for (const value of [[''], ['', ''], []]) {
      expect(calculateTextFontSize(createContext(), value, 100, false, false)).toBe(STYLE_FONT_SIZE_DEFAULT)
    }
    expect(calculateTextFontSize(createContext(), ['ab'], 0, false, false)).toBe(STYLE_FONT_SIZE_DEFAULT)
  })
})

describe('sizeText', () => {
  const VALUE = ['abc', 'abcde']

  const size = (text: Partial<TextShapeInput>) => {
    const { fontSize, width, height, ratio } = sizeText(createContext(), { type: 'text', x: 0, y: 0, value: VALUE, ...text } as TextShapeInput)
    return { fontSize, width, height, ratio }
  }

  it('keeps a text with its size', () => {
    const text = { type: 'text', x: 0, y: 0, value: VALUE, width: 10, height: 10, fontSize: 3 } as TextShapeInput
    expect(sizeText(createContext(), text)).toBe(text)
  })

  it('fits the font size to a given width', () => {
    // the longest line has 5 characters
    expect(size({ width: 100 })).toEqual({ fontSize: 20, width: 100, height: 40, ratio: 2.5 })
  })

  it('measures the width from a given font size, or from a given height shared by the lines', () => {
    expect(size({ fontSize: 20 })).toEqual({ fontSize: 20, width: 100, height: 40, ratio: 2.5 })
    expect(size({ height: 40 })).toEqual({ fontSize: 20, width: 100, height: 40, ratio: 2.5 })
  })

  it('gives the default font size to a text without characters, on the height of a line at least', () => {
    for (const value of [[''], []]) {
      expect(size({ value, width: 100 })).toEqual({
        fontSize: STYLE_FONT_SIZE_DEFAULT,
        width: 100,
        height: STYLE_FONT_SIZE_DEFAULT,
        ratio: 100 / STYLE_FONT_SIZE_DEFAULT
      })
    }
  })

  it('keeps a given width and font size together', () => {
    expect(size({ width: 300, fontSize: 20 })).toEqual({ fontSize: 20, width: 300, height: 40, ratio: 7.5 })
  })

  it('gives the default font size to a text without size', () => {
    expect(size({}).fontSize).toBe(STYLE_FONT_SIZE_DEFAULT)
    expect(size({}).width).toBe(5 * STYLE_FONT_SIZE_DEFAULT)
  })
})

describe('resizeTextShapeWithNewContent', () => {
  const update = (text: ShapeEntity<'text'>, value: string[]) =>
    refreshShape(resizeTextShapeWithNewContent(createContext(), text, value), UTILS_SETTINGS) as ShapeEntity<'text'>

  it('fits the box of a text to its new content, keeping its top left corner', () => {
    const text = createText({ x: 10, y: 20, width: 50, height: 10, fontSize: 10, value: ['abcde'] })
    expect(update(text, ['abcdefghij', 'abc'])).toMatchObject({ x: 10, y: 20, width: 100, height: 20, ratio: 5 })
  })

  it('keeps a box of a line for an emptied text, 20 wide', () => {
    const text = createText({ x: 10, y: 20, width: 50, height: 10, fontSize: 10, value: ['abcde'] })
    for (const value of [[''], []]) {
      expect(update(text, value)).toMatchObject({ x: 10, y: 20, width: 20, height: 10, ratio: 2 })
    }
  })

  it('keeps the right side of a text aligned on the right, and the middle of a centered text', () => {
    const text = (textAlign: TextAlign) => createText({ x: 10, y: 20, width: 50, height: 10, fontSize: 10, value: ['abcde'], style: { textAlign } })
    expect(update(text('right'), ['abcdefghij'])).toMatchObject({ x: -40, y: 20, width: 100 })
    expect(update(text('center'), ['abcdefghij'])).toMatchObject({ x: -15, y: 20, width: 100 })
    expect(update(text('left'), ['abcdefghij'])).toMatchObject({ x: 10, y: 20, width: 100 })
  })

  it('keeps the top left corner of a turned text at the same place of the screen, its center moving', () => {
    // typing in a text turned by a quarter: it grows downwards on the screen
    const text = createText({ x: 0, y: 0, width: 50, height: 10, fontSize: 10, value: ['abcde'], rotation: Math.PI / 2 })
    const updated = update(text, ['abcdefghij'])
    expect(updated.width).toBe(100)
    const [x, y] = getTopLeftOnScreen(updated)
    const [expectedX, expectedY] = getTopLeftOnScreen(text)
    expect(x).toBeCloseTo(expectedX)
    expect(y).toBeCloseTo(expectedY)
    expect(updated.computed.center).not.toEqual(text.computed.center)
  })
})

describe('createText', () => {
  const textTool = DEFAULT_TOOLS.find(tool => tool.type === 'text')!
  const create = (settings: ToolsSettingsType<'text'>) =>
    createTextShape(createContext(), { id: 'text-tool', type: 'text', settings }, [200, 100], UTILS_SETTINGS)

  it('makes a new text as wide as its content at the font size of its tool, without the font size in its style', () => {
    const settings = textTool.settings as ToolsSettingsType<'text'>
    const text = create({ ...settings, fontSize: { min: 8, max: 200, step: 1, default: 20 } })
    expect(text).toMatchObject({ value: ['Texte'], fontSize: 20, width: 100, height: 20, x: 100, y: 80 })
    expect(text.style).not.toHaveProperty('fontSize')
    expect(text.style).toMatchObject({ textAlign: 'left' })
  })

  it('makes a new text 150 wide without the font size setting', () => {
    const { fontSize: _fontSize, ...settings } = textTool.settings as ToolsSettingsType<'text'>
    expect(create(settings)).toMatchObject({ fontSize: 30, width: 150, height: 30 })
  })
})

describe('drawText', () => {
  /**
   * Operations of the drawing of a text 100 × 30 at (10, 20), with lines of 10, on a context measuring 1 em per character.
   * Its fill style is the fill color of its style, as set before the shape is drawn
   */
  const drawCalls = (style: StyleShape, value = ['ab', '', 'abcd'], flips: { flipX?: boolean; flipY?: boolean } = {}) => {
    const calls: unknown[][] = []
    const ctx = Object.assign(createContext(), {
      globalAlpha: 1,
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
      lineJoin: '',
      fillStyle: style.fillColor ?? '',
      strokeStyle: '',
      scale: () => {},
      setLineDash: () => {},
      fill: () => calls.push(['fill', ctx.fillStyle]),
      fillRect: (...args: number[]) => calls.push(['fillRect', ctx.fillStyle, ...args]),
      strokeText: (text: string, x: number, y: number) => calls.push(['strokeText', ctx.strokeStyle, ctx.lineWidth, text, x, y]),
      fillText: (text: string, x: number, y: number) => calls.push(['fillText', ctx.fillStyle, ctx.textAlign, text, x, y])
    })
    const text = createText({ x: 10, y: 20, width: 100, height: 30, fontSize: 10, value, style, ...flips })
    drawText(ctx as unknown as CanvasRenderingContext2D, text)
    return calls
  }

  /** Alignment and position of the lines */
  const drawnLines = (style: StyleShape, flips?: { flipX?: boolean }) =>
    drawCalls({ strokeColor: 'red', ...style }, ['a', 'b'], flips).map(([, , textAlign, , x, y]) => [textAlign, x, y])

  it('draws the lines from the side of their alignment, or from the middle of the box', () => {
    expect(drawnLines({})).toEqual([
      ['left', 10, 20],
      ['left', 10, 30]
    ])
    expect(drawnLines({ textAlign: 'center' })).toEqual([
      ['center', 60, 20],
      ['center', 60, 30]
    ])
    expect(drawnLines({ textAlign: 'right' })).toEqual([
      ['right', 110, 20],
      ['right', 110, 30]
    ])
  })

  it('aligns the lines of a flipped text in the flipped space, where its box goes from -110 to -10', () => {
    expect(drawnLines({ textAlign: 'left' }, { flipX: true })[0]).toEqual(['left', -110, 20])
    expect(drawnLines({ textAlign: 'right' }, { flipX: true })[0]).toEqual(['right', -10, 20])
  })

  it('fills its background under the letters, even without their color', () => {
    expect(drawCalls({ strokeColor: 'red', fillColor: 'yellow' }, ['ab'])).toEqual([
      ['fill', 'yellow'],
      ['fillText', 'red', 'left', 'ab', 10, 20]
    ])
    expect(drawCalls({ strokeColor: 'transparent', fillColor: 'yellow' }, ['ab'])).toEqual([['fill', 'yellow']])
    expect(drawCalls({ strokeColor: 'red', fillColor: 'transparent' }, ['ab'])).toEqual([['fillText', 'red', 'left', 'ab', 10, 20]])
  })

  it('strokes the outline of all the lines under their letters, twice as thick: their letters cover its inner half', () => {
    expect(drawCalls({ strokeColor: 'red', outlineColor: 'white', outlineWidth: 3 }, ['ab', 'c'])).toEqual([
      ['strokeText', 'white', 6, 'ab', 10, 20],
      ['strokeText', 'white', 6, 'c', 10, 30],
      ['fillText', 'red', 'left', 'ab', 10, 20],
      ['fillText', 'red', 'left', 'c', 10, 30]
    ])
    // the outline is 2 thick by default, and draws hollow letters without their color
    expect(drawCalls({ strokeColor: 'transparent', outlineColor: 'white' }, ['ab'])).toEqual([['strokeText', 'white', 4, 'ab', 10, 20]])
    expect(drawCalls({ strokeColor: 'red', outlineColor: 'white', outlineWidth: 0 }, ['ab'])).toEqual([['fillText', 'red', 'left', 'ab', 10, 20]])
  })

  it('draws the lines under and through the letters of the lines which have some, as wide as them on the side of their alignment', () => {
    const decorations = (style: StyleShape) => drawCalls({ strokeColor: 'red', ...style }).filter(([name]) => name === 'fillRect')
    const thickness = 10 / 15
    expect(decorations({ fontUnderline: true })).toEqual([
      ['fillRect', 'red', 10, 29 - thickness / 2, 20, thickness],
      ['fillRect', 'red', 10, 49 - thickness / 2, 40, thickness]
    ])
    expect(decorations({ fontStrikethrough: true, textAlign: 'right' })).toEqual([
      ['fillRect', 'red', 90, 25.5 - thickness / 2, 20, thickness],
      ['fillRect', 'red', 70, 45.5 - thickness / 2, 40, thickness]
    ])
    expect(decorations({ fontUnderline: true, fontStrikethrough: true, textAlign: 'center' })).toHaveLength(4)
    // they have the color of the letters
    expect(decorations({ strokeColor: 'transparent', fontUnderline: true })).toEqual([])
  })

  it('narrows the decorations of a line wider than the box, like its letters, and keeps them under the letters of a flipped text', () => {
    const [underline] = drawCalls({ strokeColor: 'red', fontUnderline: true }, ['abcdefghijklmnop']).filter(([name]) => name === 'fillRect')
    expect(underline![4]).toBe(100)
    // the box of the flipped text goes from -50 to -20 in the flipped space
    const [flippedUnderline] = drawCalls({ strokeColor: 'red', fontUnderline: true }, ['ab'], { flipY: true }).filter(([name]) => name === 'fillRect')
    expect(flippedUnderline![3]).toBeCloseTo(-50 + 9 - 1 / 3)
  })

  it('draws the letters in the middle of their lines, like CSS, and their decorations under them', () => {
    // lines of 20 for a font size of 10: the letters are 5 below the top of their line
    expect(drawnLines({ lineHeight: 2 })).toEqual([
      ['left', 10, 25],
      ['left', 10, 45]
    ])
    const [, underline] = drawCalls({ strokeColor: 'red', fontUnderline: true, lineHeight: 2 }, ['ab'])
    expect(underline![3]).toBeCloseTo(25 + 9 - 1 / 3)
  })
})

describe('background, outline and decorations of a text', () => {
  it('makes the text painted several times with several paints, or with several lines of letters', () => {
    const isPaintedSeveralTimes = (style: StyleShape, value = ['ab']) =>
      isTextPaintedSeveralTimes(createText({ x: 0, y: 0, width: 100, height: 10, fontSize: 10, value, style }))
    expect(isPaintedSeveralTimes({ strokeColor: 'red' })).toBe(false)
    expect(isPaintedSeveralTimes({ strokeColor: 'red', fillColor: 'transparent', outlineColor: 'transparent' })).toBe(false)
    expect(isPaintedSeveralTimes({ strokeColor: 'red' }, ['a', 'b'])).toBe(true)
    expect(isPaintedSeveralTimes({ strokeColor: 'red', fillColor: 'yellow' })).toBe(true)
    expect(isPaintedSeveralTimes({ strokeColor: 'red', outlineColor: 'white' })).toBe(true)
    expect(isPaintedSeveralTimes({ strokeColor: 'red', fontUnderline: true })).toBe(true)
    expect(isPaintedSeveralTimes({ strokeColor: 'transparent', fillColor: 'yellow', outlineColor: 'white' })).toBe(true)
    // a single paint: a background, or the outline of a single line, or lines without letters
    expect(isPaintedSeveralTimes({ strokeColor: 'transparent', fillColor: 'yellow' }, ['a', 'b'])).toBe(false)
    expect(isPaintedSeveralTimes({ strokeColor: 'transparent', outlineColor: 'white' })).toBe(false)
    expect(isPaintedSeveralTimes({ strokeColor: 'transparent', fontStrikethrough: true })).toBe(false)
  })

  it('fills the selection frame with the background, on which the text is clicked', () => {
    const rect = vi.spyOn(Path2D.prototype, 'rect')
    // the selection padding of 5 is in the borders, which the background does not go beyond
    const text = createText({ x: 0, y: 0, width: 100, height: 50, fontSize: 50, value: ['ab'], style: { fillColor: 'yellow' } })
    expect(text.computed.borders).toEqual({ x: -5, y: -5, width: 110, height: 60 })
    expect(rect).toHaveBeenLastCalledWith(-5, -5, 110, 60)
    expect(text.computed.outerBorders).toEqual(text.computed.borders)
    createText({ x: 0, y: 0, width: 100, height: 50, fontSize: 50, value: ['ab'], style: {} })
    expect(rect).toHaveBeenLastCalledWith(0, 0, 100, 50)
    vi.restoreAllMocks()
  })

  it('holds the outline of the letters in the outer borders, beyond the selection padding', () => {
    const outlined = (outlineWidth: number) =>
      createText({ x: 0, y: 0, width: 100, height: 50, fontSize: 50, value: ['ab'], style: { outlineColor: 'red', outlineWidth } })
    expect(outlined(8).computed.outerBorders).toEqual({ x: -8, y: -8, width: 116, height: 66 })
    expect(outlined(3).computed.outerBorders).toEqual(outlined(3).computed.borders)
  })
})

describe('line height of a text', () => {
  it('makes the box as high as the lines, from its font size, or its font size from its height or its width', () => {
    const size = (text: Partial<TextShapeInput>) => {
      const sized = sizeText(createContext(), {
        type: 'text',
        x: 0,
        y: 0,
        value: ['abc', 'abcde'],
        style: { lineHeight: 1.5 },
        ...text
      } as TextShapeInput)
      return [sized.fontSize, sized.width, sized.height]
    }
    expect(size({ fontSize: 20 })).toEqual([20, 100, 60])
    expect(size({ height: 60 })).toEqual([20, 100, 60])
    expect(size({ width: 100 })).toEqual([20, 100, 60])
    // a line height which is not positive is the default one
    expect(size({ fontSize: 20, style: { lineHeight: 0 } })).toEqual([20, 100, 40])
  })

  it('fits the box to new content with the height of the lines', () => {
    const text = createText({ x: 10, y: 20, width: 50, height: 20, fontSize: 10, value: ['abcde'], style: { lineHeight: 2 } })
    const updated = resizeTextShapeWithNewContent(createContext(), text, ['abc', 'b'])
    expect(updated).toMatchObject({ x: 10, y: 20, width: 30, height: 40 })
  })

  it('holds the letters of the lines lower than the font size in the outer borders', () => {
    // lines of 25 for a font size of 50: the letters go 12.5 beyond the top and the bottom of the box, padded by 5
    const text = createText({ x: 0, y: 0, width: 100, height: 25, fontSize: 50, value: ['ab'], style: { lineHeight: 0.5 } })
    expect(text.computed.outerBorders).toEqual({ x: -5, y: -12.5, width: 110, height: 50 })
    const outlined = createText({
      x: 0,
      y: 0,
      width: 100,
      height: 25,
      fontSize: 50,
      value: ['ab'],
      style: { lineHeight: 0.5, outlineColor: 'red', outlineWidth: 8 }
    })
    expect(outlined.computed.outerBorders).toEqual({ x: -8, y: -20.5, width: 116, height: 66 })
  })
})
