import type { CustomShapeParams, CustomTool, ShapeType } from '@canvas/index'
import {
  arrowIcon,
  brushIcon,
  circleIcon,
  curveIcon,
  groupIcon,
  pictureIcon,
  polygonIcon,
  squareIcon,
  starIcon,
  textIcon
} from '@editor/constants/icons'
import { TOOL_LABELS } from '@editor/constants/tools'

export const getShapePicture = (shape: ShapeType) => {
  switch (shape) {
    case 'brush':
      return brushIcon
    case 'line':
      return arrowIcon
    case 'polygon':
      return polygonIcon
    case 'curve':
      return curveIcon
    case 'rect':
      return squareIcon // temporary
    case 'square':
      return squareIcon
    case 'circle':
      return circleIcon
    case 'ellipse':
      return circleIcon // temporary
    case 'text':
      return textIcon
    case 'picture':
      return pictureIcon
    case 'custom':
      // the generic icon of the custom shapes: a custom tool without an icon shows its own shape instead, see getToolIcon
      return starIcon
    case 'group':
      return groupIcon
  }
}

/** The values the parameters a custom tool declares take in its new shapes */
export const getDefaultParams = (declarations: Record<string, { default: number }> | undefined): CustomShapeParams =>
  Object.fromEntries(Object.entries(declarations ?? {}).map(([name, declaration]) => [name, declaration.default]))

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * The icon of a custom tool which gives none: the shape it draws, its path built with the default values of its
 * parameters and fitted in the icon by its view box. The generic icon when the path cannot be built
 */
const getCustomToolIcon = (tool: Extract<CustomTool, { type: 'custom' }>): string => {
  const { viewBox, path } = tool.shape
  try {
    const data = typeof path === 'string' ? path : path(getDefaultParams(tool.settings.params))
    if (data) return `<svg viewBox="${viewBox.join(' ')}"><path d="${escapeAttribute(data)}"/></svg>`
  } catch {
    // the canvas warns about it when it draws a shape of the tool
  }
  return getShapePicture('custom')
}

/** The icon of a tool, in the toolbar and in the layers of its shapes: the one it gives, or else the one of its type */
export const getToolIcon = (tool: CustomTool): string =>
  tool.icon ?? (tool.type === 'custom' ? getCustomToolIcon(tool) : getShapePicture(tool.type))

export type DisplayTool = CustomTool & { icon: string; label: string }

/** Tools coming from the canvas may have no icon or label: they are resolved here from the tool type */
export const getDisplayTool = (tool: CustomTool): DisplayTool => ({
  ...tool,
  icon: getToolIcon(tool),
  label: tool.label ?? TOOL_LABELS[tool.type]
})
