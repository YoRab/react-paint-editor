import type { ShapeType } from 'types/Shapes'
import _ from 'lodash/fp'
import type { CustomTool, CustomToolInput } from 'types/tools'
import type { RecursivePartial } from 'types/utils'
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
} from 'constants/tools'

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
) => {
  return _.flow(
    _.flatMap((group: ShapeType | { title: string; vertical: boolean; toolsType: ShapeType[] }) => {
      if (!_.isObject(group)) {
        return _.filter({ type: group }, availableTools)
      }
      const toolsType = _.filter(tool => _.includes(tool.type, group.toolsType), availableTools)
      if (!toolsType) return null
      return { ...group, toolsType }
    }),
    _.compact
  )(defaultStructure) as unknown as (
    | CustomTool
    | {
        title: string
        toolsType: CustomTool[]
        vertical: boolean
      }
  )[]
}

export const sanitizeTools = (tools: RecursivePartial<CustomToolInput>[], withPicture = false) => {
  const customizer = (objValue: unknown, srcValue: unknown) => {
    if (_.isArray(objValue)) {
      return srcValue
    }
  }

  return _.flow(
    _.map((tool: RecursivePartial<CustomToolInput>) => {
      if (!_.isObject(tool)) return null
      switch (_.get('type', tool)) {
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
    }),
    tools => (withPicture ? [...tools, DEFAULT_SHAPE_PICTURE] : tools),
    _.compact
  )(tools) as CustomTool[]
}
