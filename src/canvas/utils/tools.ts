import type { CustomTool, CustomToolInput } from '@common/types/tools'
import type { RecursivePartial } from '@common/types/utils'
import { compact } from '@common/utils/array'
import { mergeWith } from '@common/utils/object'
import {
  DEFAULT_SHAPE_BRUSH,
  DEFAULT_SHAPE_CIRCLE,
  DEFAULT_SHAPE_CURVE,
  DEFAULT_SHAPE_ELLIPSE,
  DEFAULT_SHAPE_LINE,
  DEFAULT_SHAPE_PICTURE,
  DEFAULT_SHAPE_POLYGON,
  DEFAULT_SHAPE_RECT,
  DEFAULT_SHAPE_SQUARE,
  DEFAULT_SHAPE_TEXT
} from '@editor/constants/tools'

export const sanitizeTools = (tools: RecursivePartial<CustomToolInput>[], withPicture = false): CustomTool[] => {
  const customizer = (objValue: unknown, srcValue: unknown) => {
    if (Array.isArray(objValue)) {
      return srcValue
    }
  }

  const customTools = tools.map((tool: RecursivePartial<CustomToolInput>) => {
    if (typeof tool !== 'object') return null
    switch (tool.type) {
      case 'brush':
        return mergeWith(customizer, DEFAULT_SHAPE_BRUSH, tool) as CustomTool
      case 'circle':
        return mergeWith(customizer, DEFAULT_SHAPE_CIRCLE, tool) as CustomTool
      case 'curve':
        return mergeWith(customizer, DEFAULT_SHAPE_CURVE, tool) as CustomTool
      case 'ellipse':
        return mergeWith(customizer, DEFAULT_SHAPE_ELLIPSE, tool) as CustomTool
      case 'line':
        return mergeWith(customizer, DEFAULT_SHAPE_LINE, tool) as CustomTool
      case 'polygon':
        return mergeWith(customizer, DEFAULT_SHAPE_POLYGON, tool) as CustomTool
      case 'rect':
        return mergeWith(customizer, DEFAULT_SHAPE_RECT, tool) as CustomTool
      case 'square':
        return mergeWith(customizer, DEFAULT_SHAPE_SQUARE, tool) as CustomTool
      case 'text':
        return mergeWith(customizer, DEFAULT_SHAPE_TEXT, tool) as CustomTool
    }
    return null
  })

  return compact(withPicture ? [...customTools, DEFAULT_SHAPE_PICTURE] : customTools)
}
