import { type CustomShapeDefinition, type CustomTool, SETTINGS_DEFAULT_CUSTOM } from '@canvas/index'
import { getDisplayTool, getShapePicture } from '@editor/utils/style'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const customTool = (shape: CustomShapeDefinition, params: NonNullable<typeof SETTINGS_DEFAULT_CUSTOM.params> = {}): CustomTool => ({
  id: 'shape',
  type: 'custom',
  shape,
  settings: { ...SETTINGS_DEFAULT_CUSTOM, params }
})

const markup = (icon: ReactNode) => renderToStaticMarkup(icon)

describe('getDisplayTool of a custom tool', () => {
  it('draws the icon of a tool which gives none from its own path, in its view box', () => {
    const tool = customTool({ viewBox: [0, 0, 100, 90], path: 'M50 90 L0 0 L100 0 Z' })
    expect(markup(getDisplayTool(tool).icon)).toBe('<svg viewBox="0 0 100 90" aria-hidden="true"><path d="M50 90 L0 0 L100 0 Z"></path></svg>')
  })

  it('builds the path with the default values of the parameters', () => {
    const tool = customTool(
      { viewBox: [0, 0, 10, 10], path: ({ size }) => `M0 0 L${size} 0 Z` },
      { size: { label: 'Size', min: 0, max: 10, step: 1, default: 7 } }
    )
    expect(markup(getDisplayTool(tool).icon)).toBe('<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0 L7 0 Z"></path></svg>')
  })

  it('keeps the path in its attribute', () => {
    const tool = customTool({ viewBox: [0, 0, 10, 10], path: 'M0 0"/><img src=x onerror=alert(1)>' })
    expect(markup(getDisplayTool(tool).icon)).not.toContain('<img')
  })

  it('keeps the icon the tool gives', () => {
    const icon = createElement('svg')
    expect(getDisplayTool({ ...customTool({ viewBox: [0, 0, 10, 10], path: 'M0 0 Z' }), icon }).icon).toBe(icon)
  })

  it('gives the generic icon when the path is empty or cannot be built', () => {
    const failing = () => {
      throw new Error('broken')
    }
    expect(getDisplayTool(customTool({ viewBox: [0, 0, 10, 10], path: failing })).icon).toBe(getShapePicture('custom'))
    expect(getDisplayTool(customTool({ viewBox: [0, 0, 10, 10], path: () => '' })).icon).toBe(getShapePicture('custom'))
  })
})
