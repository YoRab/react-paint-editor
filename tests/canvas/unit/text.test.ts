import { STYLE_FONT_SIZE_DEFAULT } from '@canvas/constants/rendering'
import { DEFAULT_TOOLS } from '@canvas/constants/tools'
import type { DrawableShape, Point, ShapeEntity, StyleShape, TextAlign, TextShapeInput } from '@canvas/types/Shapes'
import type { ToolsSettingsType } from '@canvas/types/tools'
import { refreshShape } from '@canvas/utils/shapes'
import { calculateTextFontSize, createText as createTextShape, drawText, resizeTextShapeWithNewContent, sizeText } from '@canvas/utils/shapes/text'
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
  const draw = (textAlign: StyleShape['textAlign'], flipX = false) => {
    const ctx = { scale: vi.fn(), fillText: vi.fn(), font: '', textAlign: '', textBaseline: '', fillStyle: '', globalAlpha: 1 }
    const text = createText({
      x: 10,
      y: 20,
      width: 100,
      height: 20,
      fontSize: 10,
      value: ['a', 'b'],
      flipX,
      style: { strokeColor: 'red', ...(textAlign ? { textAlign } : {}) }
    })
    drawText(ctx as unknown as CanvasRenderingContext2D, text)
    return { textAlign: ctx.textAlign, lines: ctx.fillText.mock.calls.map(([, x, y]) => [x, y]) }
  }

  it('draws the lines from the side of their alignment, or from the middle of the box', () => {
    expect(draw(undefined)).toEqual({
      textAlign: 'left',
      lines: [
        [10, 20],
        [10, 30]
      ]
    })
    expect(draw('center')).toEqual({
      textAlign: 'center',
      lines: [
        [60, 20],
        [60, 30]
      ]
    })
    expect(draw('right')).toEqual({
      textAlign: 'right',
      lines: [
        [110, 20],
        [110, 30]
      ]
    })
  })

  it('aligns the lines of a flipped text in the flipped space, where its box goes from -110 to -10', () => {
    expect(draw('left', true).lines[0]).toEqual([-110, 20])
    expect(draw('right', true).lines[0]).toEqual([-10, 20])
  })
})
