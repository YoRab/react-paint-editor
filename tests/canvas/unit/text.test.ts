import { STYLE_FONT_SIZE_DEFAULT } from '@canvas/constants/rendering'
import type { DrawableShape, Point, ShapeEntity, TextShapeInput } from '@canvas/types/Shapes'
import { refreshShape } from '@canvas/utils/shapes'
import { calculateTextFontSize, resizeTextShapeWithNewContent, sizeText } from '@canvas/utils/shapes/text'
import { rotatePoint } from '@canvas/utils/trigo'
import { describe, expect, it } from 'vitest'
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
    refreshShape(resizeTextShapeWithNewContent(createContext(), text, value, UTILS_SETTINGS), UTILS_SETTINGS) as ShapeEntity<'text'>

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
