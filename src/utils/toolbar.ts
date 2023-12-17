import type { ShapeType } from '../types/Shapes'
import _ from 'lodash/fp'
import type { CustomTool, CustomToolInput } from '../types/tools'
import type { RecursivePartial } from '../types/utils'
import {
  DEFAULT_SHAPE_BRUSH,
  DEFAULT_SHAPE_CIRCLE,
  DEFAULT_SHAPE_CURVE,
  DEFAULT_SHAPE_ELLIPSE,
  DEFAULT_SHAPE_LINE,
  DEFAULT_SHAPE_POLYGON,
  DEFAULT_SHAPE_RECT,
  DEFAULT_SHAPE_SQUARE,
  DEFAULT_SHAPE_TEXT,
  DEFAULT_SHAPE_PICTURE
} from '../constants/tools'
import { compact } from 'src/utils/array'

export const getCurrentStructure = (
  availableTools: CustomTool[],
  defaultStructure: (
    | ShapeType
    | {
      title: string
      toolsType: ShapeType[]
      vertical: boolean
    }
  )[]
): (CustomTool |
{
  title: string
  toolsType: CustomTool[]
  vertical: boolean
})[] => {

  const structure = defaultStructure.flatMap((group): CustomTool | CustomTool[] | {
    toolsType: CustomTool[];
    title: string;
    vertical: boolean;
  } | null => {
    if (typeof group !== 'object') {
      return availableTools.filter(tool => tool.type === group)
    }
    const toolsType = availableTools.filter(tool => group.toolsType.includes(tool.type))
    if (!toolsType) return null
    return { ...group, toolsType }
  })
  return compact(structure)
}

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
        return _.mergeWith(customizer, DEFAULT_SHAPE_BRUSH, tool)
      case 'circle':
        return _.mergeWith(customizer, DEFAULT_SHAPE_CIRCLE, tool)
      case 'curve':
        return _.mergeWith(customizer, DEFAULT_SHAPE_CURVE, tool)
      case 'ellipse':
        return _.mergeWith(customizer, DEFAULT_SHAPE_ELLIPSE, tool)
      case 'line':
        return _.mergeWith(customizer, DEFAULT_SHAPE_LINE, tool)
      case 'polygon':
        return _.mergeWith(customizer, DEFAULT_SHAPE_POLYGON, tool)
      case 'rect':
        return _.mergeWith(customizer, DEFAULT_SHAPE_RECT, tool)
      case 'square':
        return _.mergeWith(customizer, DEFAULT_SHAPE_SQUARE, tool)
      case 'text':
        return _.mergeWith(customizer, DEFAULT_SHAPE_TEXT, tool)
    }
    return null
  })

  return compact(withPicture ? [...customTools, DEFAULT_SHAPE_PICTURE] : customTools)
}
