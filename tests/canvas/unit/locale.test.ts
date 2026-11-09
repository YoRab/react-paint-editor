import { DEFAULT_CANVAS_LOCALE, type Message, type PartialLocale } from '@canvas/constants/locale'
import { ReactPaintError } from '@canvas/utils/error'
import { decodeJson } from '@canvas/utils/file'
import { formatMessage, formatNumber, mergeLocale } from '@canvas/utils/locale'
import { describe, expect, it } from 'vitest'

/**
 * @vitest-environment jsdom
 */

// a no-break space, narrow or not depending on the version of ICU
const NO_BREAK_SPACE_THOUSANDS = /^1[\u00a0\u202f]234,5 formes$/
const NO_BREAK_SPACE_PERCENT = /^150[\u00a0\u202f]%$/

describe('formatMessage', () => {
  it('replaces the parameters, and leaves the ones without value', () => {
    expect(formatMessage('{name} added', { name: 'Rectangle 2' })).toBe('Rectangle 2 added')
    expect(formatMessage('{name} added in {group}', { name: 'Rectangle 2' })).toBe('Rectangle 2 added in {group}')
    expect(formatMessage('No parameter')).toBe('No parameter')
  })

  it('writes the numbers in the language', () => {
    expect(formatMessage('{count} shapes', { count: 1234.5 }, 'en')).toBe('1,234.5 shapes')
    // a no-break space separates the thousands in French
    expect(formatMessage('{count} formes', { count: 1234.5 }, 'fr')).toMatch(NO_BREAK_SPACE_THOUSANDS)
    // a number given as a string is kept as it is
    expect(formatMessage('{type} {number}', { type: 'Rectangle', number: '1234' }, 'en')).toBe('Rectangle 1234')
  })

  it('chooses the form of a plural message from the count, in the language', () => {
    const added = { one: '{count} shape added', other: '{count} shapes added' }
    expect(formatMessage(added, { count: 1 }, 'en')).toBe('1 shape added')
    expect(formatMessage(added, { count: 0 }, 'en')).toBe('0 shapes added')
    expect(formatMessage(added, { count: 3 }, 'en')).toBe('3 shapes added')
    // 0 is singular in French
    const ajoutees = { one: '{count} forme ajoutée', other: '{count} formes ajoutées' }
    expect(formatMessage(ajoutees, { count: 0 }, 'fr')).toBe('0 forme ajoutée')
    expect(formatMessage(ajoutees, { count: 2 }, 'fr')).toBe('2 formes ajoutées')
  })

  it('takes the forms of the languages which have more than two', () => {
    const polish = { one: '{count} kształt', few: '{count} kształty', many: '{count} kształtów', other: '{count} kształtu' }
    expect(formatMessage(polish, { count: 1 }, 'pl')).toBe('1 kształt')
    expect(formatMessage(polish, { count: 3 }, 'pl')).toBe('3 kształty')
    expect(formatMessage(polish, { count: 5 }, 'pl')).toBe('5 kształtów')
    expect(formatMessage(polish, { count: 1.5 }, 'pl')).toBe('1,5 kształtu')
  })

  it("uses 'other' for a category without form, or without count", () => {
    expect(formatMessage({ other: '{count} shapes' }, { count: 1 }, 'en')).toBe('1 shapes')
    expect(formatMessage({ one: 'one shape', other: 'shapes' })).toBe('shapes')
  })

  it('falls back to English for a language Intl does not know, without failing', () => {
    expect(formatMessage({ one: '{count} shape', other: '{count} shapes' }, { count: 1000 }, 'not a language!')).toBe('1,000 shapes')
    expect(formatNumber(0.5, '', { style: 'percent' })).toBe('50%')
  })
})

describe('formatNumber', () => {
  it('writes the percents and the units of the language', () => {
    expect(formatNumber(1.5, 'en', { style: 'percent' })).toBe('150%')
    // a no-break space before the sign in French
    expect(formatNumber(1.5, 'fr', { style: 'percent' })).toMatch(NO_BREAK_SPACE_PERCENT)
    expect(formatNumber(45, 'fr', { style: 'unit', unit: 'degree' })).toBe('45°')
  })
})

describe('mergeLocale', () => {
  it('replaces some texts, the groups being merged', () => {
    const texts: PartialLocale<typeof DEFAULT_CANVAS_LOCALE> = {
      lang: 'fr',
      canvas: { canvas: 'Dessin', shapeTypes: { rect: 'Rectangle' }, keys: { shift: 'Maj' } }
    }
    const merged = mergeLocale(DEFAULT_CANVAS_LOCALE, texts)
    expect(merged.lang).toBe('fr')
    expect(merged.canvas.canvas).toBe('Dessin')
    expect(merged.canvas.keys).toEqual({ ...DEFAULT_CANVAS_LOCALE.canvas.keys, shift: 'Maj' })
    expect(merged.canvas.shapeTypes.circle).toBe('Circle')
    // the locale merged into is not changed
    expect(DEFAULT_CANVAS_LOCALE.canvas.canvas).toBe('Drawing')
  })

  it('replaces a plural message whole: its forms are not mixed with the ones of another language', () => {
    const base: { lang: string; messages: { added: Message } } = {
      lang: 'en',
      messages: { added: { one: '{count} shape added', other: '{count} shapes added' } }
    }
    const merged = mergeLocale(base, { messages: { added: { other: '{count} formes ajoutées' } } })
    expect(merged.messages.added).toEqual({ other: '{count} formes ajoutées' })
    // a plain text may become a plural message, and the other way
    const text: { text: Message } = { text: 'shapes' }
    expect(mergeLocale(text, { text: { one: 'shape', other: 'shapes' } }).text).toEqual({ one: 'shape', other: 'shapes' })
    expect(mergeLocale(base, { messages: { added: 'added' } }).messages.added).toBe('added')
  })

  it('returns the locale itself when nothing is replaced', () => {
    expect(mergeLocale(DEFAULT_CANVAS_LOCALE, undefined)).toBe(DEFAULT_CANVAS_LOCALE)
    expect(mergeLocale(DEFAULT_CANVAS_LOCALE, {})).toBe(DEFAULT_CANVAS_LOCALE)
    expect(mergeLocale(DEFAULT_CANVAS_LOCALE, { lang: 'en', canvas: { canvas: 'Drawing', keys: undefined } })).toBe(DEFAULT_CANVAS_LOCALE)
  })
})

describe('ReactPaintError', () => {
  it('tells the code of what went wrong, and the values it depends on', async () => {
    const error = await decodeJson(new File(['{ shapes'], 'broken.json')).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ReactPaintError)
    expect(error).toMatchObject({ code: 'fileInvalidJson', name: 'ReactPaintError', message: 'Invalid JSON file' })

    const large = new File(['{}'], 'large.json')
    Object.defineProperty(large, 'size', { value: 200 * 1024 * 1024 })
    await expect(decodeJson(large)).rejects.toMatchObject({ code: 'fileTooLarge', details: { max: 100 } })
  })
})
