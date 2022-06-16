import { ShapeEnum } from 'types/Shapes'
import _ from 'lodash/fp'
import { CustomTool, CustomToolInput } from 'types/tools'
import { RecursivePartial } from 'types/utils'
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
    | ShapeEnum
    | {
        title: string
        toolsType: ShapeEnum[]
        vertical: boolean
      }
  )[]
) => {
  return _.flow(
    _.flatMap((group: ShapeEnum | { title: string; vertical: boolean; toolsType: ShapeEnum[] }) => {
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
        case ShapeEnum.brush:
          return _.mergeWith(customizer, DEFAULT_SHAPE_BRUSH, tool)
        case ShapeEnum.circle:
          return _.mergeWith(customizer, DEFAULT_SHAPE_CIRCLE, tool)
        case ShapeEnum.curve:
          return _.mergeWith(customizer, DEFAULT_SHAPE_CURVE, tool)
        case ShapeEnum.ellipse:
          return _.mergeWith(customizer, DEFAULT_SHAPE_ELLIPSE, tool)
        case ShapeEnum.line:
          return _.mergeWith(customizer, DEFAULT_SHAPE_LINE, tool)
        case ShapeEnum.polygon:
          return _.mergeWith(customizer, DEFAULT_SHAPE_POLYGON, tool)
        case ShapeEnum.rect:
          return _.mergeWith(customizer, DEFAULT_SHAPE_RECT, tool)
        case ShapeEnum.square:
          return _.mergeWith(customizer, DEFAULT_SHAPE_SQUARE, tool)
        case ShapeEnum.text:
          return _.mergeWith(customizer, DEFAULT_SHAPE_TEXT, tool)
      }
      return null
    }),
    tools => (withPicture ? [...tools, DEFAULT_SHAPE_PICTURE] : tools),
    _.compact
  )(tools) as CustomTool[]
}
