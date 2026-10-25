import { STYLE_FIELDS_SHAPE_TYPES } from '@canvas/constants/shapes'
import { DEFAULT_TOOLS, SETTINGS_DEFAULT_RECT } from '@canvas/constants/tools'
import type { CustomTool } from '@canvas/types/tools'
import { buildAvailableTools, findShapeTool, getToolDefaultStyle } from '@canvas/utils/tools'
import { describe, expect, it } from 'vitest'

describe('buildAvailableTools', () => {
  it('gives the default tools without tools', () => {
    expect(buildAvailableTools(undefined)).toBe(DEFAULT_TOOLS)
  })

  it('completes a tool with the default tool of its type, its arrays replacing the default ones', () => {
    const [tool] = buildAvailableTools([{ type: 'rect', id: 'my-rect', settings: { strokeColor: { values: ['red', 'blue'] } } }])
    expect(tool).toMatchObject({ type: 'rect', id: 'my-rect' })
    expect(tool?.type === 'rect' && tool.settings).toEqual({
      ...SETTINGS_DEFAULT_RECT,
      strokeColor: { values: ['red', 'blue'], default: SETTINGS_DEFAULT_RECT.strokeColor.default }
    })
  })

  it('keeps the tools in their order, a tool of an unknown type as it is, and leaves out the tools without type', () => {
    const star = { type: 'star', id: 'star' } as never
    const tools = buildAvailableTools([
      { type: 'circle', id: 'circle' },
      { id: 'no-type' } as never,
      'rect' as never,
      star,
      { type: 'line', id: 'line' }
    ])
    expect(tools.map(tool => tool.id)).toEqual(['circle', 'star', 'line'])
    expect(tools[1]).toBe(star)
  })

  it('leaves out the entries which are not tools, null and arrays included', () => {
    const tools = buildAvailableTools([null as never, [{ type: 'rect' }] as never, { type: 'rect', id: 'rect' }])
    expect(tools.map(tool => tool.id)).toEqual(['rect'])
  })
})

describe('DEFAULT_TOOLS', () => {
  it('gives the settings of the joins, of the caps, of the corners and of the alignment to the tools of the shapes they apply to', () => {
    for (const field of ['lineJoin', 'lineCap', 'cornerRadius', 'textAlign'] as const) {
      const types = DEFAULT_TOOLS.filter(tool => field in tool.settings).map(tool => tool.type)
      expect(types.sort()).toEqual([...STYLE_FIELDS_SHAPE_TYPES[field]!].sort())
    }
  })
})

describe('findShapeTool', () => {
  const tools = [
    { type: 'rect', id: 'outlined-rect' },
    { type: 'rect', id: 'filled-rect' }
  ] as CustomTool[]

  it('finds the tool a shape was drawn with, or else the first tool of its type', () => {
    expect(findShapeTool(tools, { type: 'rect', toolId: 'filled-rect' })?.id).toBe('filled-rect')
    expect(findShapeTool(tools, { type: 'rect', toolId: 'removed-rect' })?.id).toBe('outlined-rect')
    expect(findShapeTool(tools, { type: 'rect' })?.id).toBe('outlined-rect')
    expect(findShapeTool(tools, { type: 'circle' })).toBeUndefined()
  })
})

describe('getToolDefaultStyle', () => {
  it('makes a style of the default values of the settings of a tool', () => {
    const rectTool = DEFAULT_TOOLS.find(tool => tool.type === 'rect') as CustomTool
    expect(getToolDefaultStyle(rectTool)).toEqual({
      strokeColor: 'black',
      fillColor: 'transparent',
      opacity: 100,
      lineWidth: 1,
      lineDash: 0,
      lineJoin: 'round',
      cornerRadius: 0,
      fillPattern: 'solid',
      fillGradient: 'none',
      fillColor2: 'white',
      fillGradientAngle: 0
    })
  })

  it('gives no border to the pictures of the default picture tool', () => {
    const pictureTool = DEFAULT_TOOLS.find(tool => tool.type === 'picture') as CustomTool
    expect(getToolDefaultStyle(pictureTool)).toEqual({ opacity: 100, strokeColor: 'transparent', lineWidth: 1, cornerRadius: 0 })
  })

  it('leaves out the font size of the default text tool, which is a field of the texts', () => {
    const textTool = DEFAULT_TOOLS.find(tool => tool.type === 'text') as CustomTool
    expect(textTool.settings).toHaveProperty('fontSize.default', 36)
    expect(getToolDefaultStyle(textTool)).toEqual({
      strokeColor: 'black',
      opacity: 100,
      fontFamily: 'serif',
      fontBold: false,
      fontItalic: false,
      textAlign: 'left',
      lineHeight: 1,
      fillColor: 'transparent',
      fontUnderline: false,
      fontStrikethrough: false,
      outlineColor: 'transparent',
      outlineWidth: 2
    })
  })

  it('makes an empty style without tool', () => {
    expect(getToolDefaultStyle(undefined)).toEqual({})
  })
})
