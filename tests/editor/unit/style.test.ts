import { type CustomShapeDefinition, type CustomTool, SETTINGS_DEFAULT_CUSTOM } from '@canvas/index'
import { getDisplayTool, getShapePicture } from '@editor/utils/style'
import { describe, expect, it } from 'vitest'

const customTool = (shape: CustomShapeDefinition, params: NonNullable<typeof SETTINGS_DEFAULT_CUSTOM.params> = {}): CustomTool => ({
  id: 'shape',
  type: 'custom',
  shape,
  settings: { ...SETTINGS_DEFAULT_CUSTOM, params }
})

describe('getDisplayTool of a custom tool', () => {
  it('draws the icon of a tool which gives none from its own path, in its view box', () => {
    const tool = customTool({ viewBox: [0, 0, 100, 90], path: 'M50 90 L0 0 L100 0 Z' })
    expect(getDisplayTool(tool).icon).toBe('<svg viewBox="0 0 100 90"><path d="M50 90 L0 0 L100 0 Z"/></svg>')
  })

  it('builds the path with the default values of the parameters', () => {
    const tool = customTool(
      { viewBox: [0, 0, 10, 10], path: ({ size }) => `M0 0 L${size} 0 Z` },
      { size: { label: 'Size', min: 0, max: 10, step: 1, default: 7 } }
    )
    expect(getDisplayTool(tool).icon).toBe('<svg viewBox="0 0 10 10"><path d="M0 0 L7 0 Z"/></svg>')
  })

  it('escapes the path written in the icon', () => {
    const tool = customTool({ viewBox: [0, 0, 10, 10], path: 'M0 0"/><img src=x onerror=alert(1)>' })
    expect(getDisplayTool(tool).icon).not.toContain('<img')
  })

  it('keeps the icon the tool gives', () => {
    expect(getDisplayTool({ ...customTool({ viewBox: [0, 0, 10, 10], path: 'M0 0 Z' }), icon: '<svg/>' }).icon).toBe('<svg/>')
  })

  it('gives the generic icon when the path is empty or cannot be built', () => {
    const failing = () => {
      throw new Error('broken')
    }
    expect(getDisplayTool(customTool({ viewBox: [0, 0, 10, 10], path: failing })).icon).toBe(getShapePicture('custom'))
    expect(getDisplayTool(customTool({ viewBox: [0, 0, 10, 10], path: () => '' })).icon).toBe(getShapePicture('custom'))
  })
})
