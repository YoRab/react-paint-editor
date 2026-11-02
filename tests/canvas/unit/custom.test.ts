import { SETTINGS_DEFAULT_CUSTOM } from '@canvas/constants/tools'
import type { SelectionModeResize } from '@canvas/types/Mode'
import type { CustomShapeDefinition, DrawableShape, Point, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool } from '@canvas/types/tools'
import { getResizeAnchorCenter } from '@canvas/utils/selection/anchors'
import { getShapeInputError } from '@canvas/utils/shapeInput'
import { cloneShape, createShape, mustKeepRatio, resizeShape } from '@canvas/utils/shapes'
import { refreshCustomShape } from '@canvas/utils/shapes/custom'
import { buildAvailableTools } from '@canvas/utils/tools'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MEASURE_CONTEXT, UTILS_SETTINGS } from './helpers'

/** The paths built by the shapes: Path2D only exists in a browser, and only the calls it receives can be checked here */
const addedPaths: { data: string; matrix: DOMMatrix2DInit | undefined }[] = []

class RecordingPath2D {
  data: string

  constructor(data?: string | RecordingPath2D) {
    this.data = typeof data === 'string' ? data : ''
  }

  addPath(path: RecordingPath2D, matrix?: DOMMatrix2DInit) {
    addedPaths.push({ data: path.data, matrix })
  }
}

vi.stubGlobal('Path2D', RecordingPath2D)

/** A square filling its view box */
const SQUARE: CustomShapeDefinition = { viewBox: [0, 0, 10, 10], path: 'M0 0 L10 0 L10 10 L0 10 Z' }

/** A shape of 20 x 40 at (100, 50): with a padding of 5, its borders go from (95, 45) to (125, 95) */
const customShape = (fields: Partial<DrawableShape<'custom'>> = {}, definition = SQUARE) =>
  refreshCustomShape(
    { id: 'custom_1', type: 'custom', x: 100, y: 50, width: 20, height: 40, definition, ...fields } as DrawableShape<'custom'> & { id: string },
    UTILS_SETTINGS
  )

const customTool = (settings: object = {}, shape = SQUARE) =>
  ({ id: 'star', type: 'custom', shape, settings: { ...SETTINGS_DEFAULT_CUSTOM, ...settings } }) as Extract<CustomTool, { type: 'custom' }>

const throwingDefinition: CustomShapeDefinition = {
  viewBox: [0, 0, 10, 10],
  path: () => {
    throw new Error('boom')
  }
}

beforeEach(() => {
  addedPaths.length = 0
})

describe('refreshCustomShape', () => {
  it('draws the path of its definition, its view box fitted in its box', () => {
    customShape()
    expect(addedPaths).toEqual([{ data: SQUARE.path, matrix: { a: 2, b: 0, c: 0, d: 4, e: 100, f: 50 } }])
  })

  it('moves a view box which does not start at the origin', () => {
    customShape({}, { ...SQUARE, viewBox: [5, 5, 10, 10] })
    expect(addedPaths[0]?.matrix).toEqual({ a: 2, b: 0, c: 0, d: 4, e: 90, f: 30 })
  })

  it('mirrors the path with the flips, so that it is drawn and hit tested mirrored', () => {
    customShape({ flipX: true })
    expect(addedPaths[0]?.matrix).toEqual({ a: -2, b: 0, c: 0, d: 4, e: 120, f: 50 })
    addedPaths.length = 0
    customShape({ flipX: true, flipY: true })
    expect(addedPaths[0]?.matrix).toEqual({ a: -2, b: 0, c: 0, d: -4, e: 120, f: 90 })
  })

  it('builds the path again from the parameters of the shape', () => {
    const definition: CustomShapeDefinition = { viewBox: [0, 0, 10, 10], path: ({ size }) => `M0 0 L${size} 0 Z` }
    customShape({ params: { size: 7 } }, definition)
    expect(addedPaths[0]?.data).toBe('M0 0 L7 0 Z')
  })

  it('gives the borders of its box, with the selection padding, and its center', () => {
    const shape = customShape()
    expect(shape.computed.borders).toEqual({ x: 95, y: 45, width: 30, height: 50 })
    expect(shape.computed.center).toEqual([110, 70])
  })

  it('grows its outer borders by the miter limit with a miter join, so that the spikes of a star stay inside', () => {
    expect(customShape({ style: { lineJoin: 'miter', lineWidth: 4 } }).computed.outerBorders).toEqual({ x: 87, y: 37, width: 46, height: 66 })
    expect(customShape({ style: { lineJoin: 'round', lineWidth: 4 } }).computed.outerBorders).toEqual({ x: 93, y: 43, width: 34, height: 54 })
  })

  it('keeps its box when the path of its definition throws, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const shape = customShape({}, throwingDefinition)
    expect(addedPaths).toEqual([])
    expect(shape.computed.borders).toEqual({ x: 95, y: 45, width: 30, height: 50 })
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})

describe('createShape of a custom tool', () => {
  it('creates an empty box at the cursor, with its tool, the default values of its parameters and its style', () => {
    const tool = customTool({ params: { size: { label: 'Taille', min: 1, max: 10, step: 1, default: 7 } } })
    const shape = createShape(MEASURE_CONTEXT, tool, [10, 20], UTILS_SETTINGS)
    expect(shape).toMatchObject({ type: 'custom', toolId: 'star', x: 10, y: 20, width: 0, height: 0, params: { size: 7 } })
    expect(shape?.style?.fillColor).toBe(SETTINGS_DEFAULT_CUSTOM.fillColor.default)
    // the parameters are a field of the shape, never a style field
    expect(shape?.style).not.toHaveProperty('params')
  })

  it('gives no parameters to a shape of a tool which declares none', () => {
    expect(createShape(MEASURE_CONTEXT, customTool(), [10, 20], UTILS_SETTINGS)).not.toHaveProperty('params')
  })

  it('keeps the ratio of the view box when the definition asks for it', () => {
    const tool = customTool({}, { ...SQUARE, viewBox: [0, 0, 20, 10], keepRatio: true })
    expect(createShape(MEASURE_CONTEXT, tool, [0, 0], UTILS_SETTINGS)).toMatchObject({ ratio: 2 })
  })
})

describe('resizeShape of a custom shape', () => {
  // a 100 x 100 shape at the origin: its borders go from -5 to 105
  const SHAPE = customShape({ x: 0, y: 0, width: 100, height: 100 })

  const resizeTo = (shape: ShapeEntity<'custom'>, anchor: Point, to: Point, { shift = false, alt = false } = {}) => {
    const selectionMode: SelectionModeResize = {
      mode: 'resize',
      anchor,
      cursorStartPosition: getResizeAnchorCenter(shape.computed.borders, anchor),
      originalShape: shape,
      selectedShapesLengthAtMouseDown: 1
    }
    return resizeShape(MEASURE_CONTEXT, to, shape, selectionMode, UTILS_SETTINGS, shift, alt)
  }

  const getBox = ({ x, y, width, height }: ShapeEntity<'custom'>) => ({ x, y, width, height })

  it('follows the cursor on both axes without modifier', () => {
    expect(getBox(resizeTo(SHAPE, [1, 1], [205, 155]))).toEqual({ x: 0, y: 0, width: 200, height: 150 })
  })

  it('keeps the ratio with Shift', () => {
    expect(getBox(resizeTo(SHAPE, [1, 1], [205, 155], { shift: true }))).toEqual({ x: 0, y: 0, width: 200, height: 200 })
  })

  it('keeps the ratio of a definition which asks for it without Shift', () => {
    const shape = customShape({ x: 0, y: 0, width: 100, height: 100, ratio: 1 })
    expect(getBox(resizeTo(shape, [1, 1], [205, 155]))).toEqual({ x: 0, y: 0, width: 200, height: 200 })
  })

  it('mirrors the shape when an anchor is dragged past the opposite side', () => {
    expect(resizeTo(SHAPE, [1, 1], [-105, 155])).toMatchObject({ flipX: true, flipY: false })
  })
})

describe('mustKeepRatio', () => {
  it('is true for a custom shape keeping the ratio of its definition, false for one which can be stretched', () => {
    expect(mustKeepRatio([customShape({ ratio: 2 })])).toBe(true)
    expect(mustKeepRatio([customShape()])).toBe(false)
  })
})

describe('cloneShape', () => {
  it('copies the parameters of a custom shape, so that the copy does not share them', () => {
    const shape = customShape({ params: { size: 7 } })
    const copy = cloneShape(shape)
    expect(copy.params).toEqual({ size: 7 })
    expect(copy.params).not.toBe(shape.params)
  })
})

describe('getShapeInputError of a custom shape', () => {
  const input = (fields: object) => ({ type: 'custom', toolId: 'star', x: 0, y: 0, width: 10, height: 10, ...fields })

  it('accepts a shape naming its tool', () => {
    expect(getShapeInputError(input({}))).toBeUndefined()
    expect(getShapeInputError(input({ params: { size: 7 } }))).toBeUndefined()
  })

  it('refuses a shape which does not name its tool', () => {
    expect(getShapeInputError(input({ toolId: undefined }))).toBe('"toolId" must name the custom tool drawing the shape')
    expect(getShapeInputError(input({ toolId: '' }))).toBe('"toolId" must name the custom tool drawing the shape')
  })

  it('refuses parameters which are not numbers', () => {
    expect(getShapeInputError(input({ params: { size: 'big' } }))).toBe('"params" must be an object of finite numbers')
    expect(getShapeInputError(input({ params: 7 }))).toBe('"params" must be an object of finite numbers')
  })

  it('refuses a shape whose tool is not one of the custom tools given', () => {
    expect(getShapeInputError(input({}), new Set(['star']))).toBeUndefined()
    expect(getShapeInputError(input({}), new Set(['heart']))).toBe('no custom tool "star" draws this shape')
  })

  it('refuses the fields of another type', () => {
    expect(getShapeInputError(input({ src: 'picture.png' }))).toBe('unknown field "src" for a custom')
  })
})

describe('buildAvailableTools of a custom tool', () => {
  it('completes a custom tool with the default settings of its type', () => {
    const [tool] = buildAvailableTools([{ id: 'star', type: 'custom', shape: SQUARE, settings: { fillColor: { default: 'red' } } }])
    expect(tool?.type === 'custom' && tool.settings.fillColor).toEqual({ values: SETTINGS_DEFAULT_CUSTOM.fillColor.values, default: 'red' })
    expect(tool?.type === 'custom' && tool.shape).toBe(SQUARE)
  })

  it('leaves out a custom tool whose shape cannot be drawn, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tools = buildAvailableTools([
      { id: 'no-shape', type: 'custom', settings: {} },
      { id: 'no-path', type: 'custom', shape: { viewBox: [0, 0, 10, 10] }, settings: {} },
      { id: 'empty-path', type: 'custom', shape: { viewBox: [0, 0, 10, 10], path: '' }, settings: {} },
      { id: 'flat-box', type: 'custom', shape: { viewBox: [0, 0, 10, 0], path: 'M0 0 Z' }, settings: {} },
      { id: 'star', type: 'custom', shape: SQUARE, settings: {} }
    ])
    expect(tools.map(tool => tool.id)).toEqual(['star'])
    expect(warn).toHaveBeenCalledTimes(4)
    warn.mockRestore()
  })
})
