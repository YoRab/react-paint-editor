import { ShapeEnum } from 'types/Shapes'
import _ from 'lodash/fp'
import { CustomTool } from 'types/tools'
import { RecursivePartial } from 'types/utils'
import {
  SETTINGS_DEFAULT_CIRCLE,
  SETTINGS_DEFAULT_CURVE,
  SETTINGS_DEFAULT_ELLIPSE,
  SETTINGS_DEFAULT_LINE,
  SETTINGS_DEFAULT_PEN,
  SETTINGS_DEFAULT_PICTURE,
  SETTINGS_DEFAULT_POLYGON,
  SETTINGS_DEFAULT_RECT,
  SETTINGS_DEFAULT_SQUARE,
  SETTINGS_DEFAULT_TEXT
} from 'constants/shapes'

export const getCurrentStructure = (
  availableTools: CustomTool<ShapeEnum>[],
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
    | CustomTool<ShapeEnum>
    | {
        title: string
        toolsType: CustomTool<ShapeEnum>[]
        vertical: boolean
      }
  )[]
}

export const sanitizeTools = (tools: RecursivePartial<CustomTool<ShapeEnum>>[]) => {
  return _.flow(
    _.map(tool => {
      if (!_.isObject(tool)) return null
      switch (_.get('type', tool)) {
        case ShapeEnum.brush:
          return _.merge(SETTINGS_DEFAULT_PEN, tool)
        case ShapeEnum.circle:
          return _.merge(SETTINGS_DEFAULT_CIRCLE, tool)
        case ShapeEnum.curve:
          return _.merge(SETTINGS_DEFAULT_CURVE, tool)
        case ShapeEnum.ellipse:
          return _.merge(SETTINGS_DEFAULT_ELLIPSE, tool)
        case ShapeEnum.line:
          return _.merge(SETTINGS_DEFAULT_LINE, tool)
        case ShapeEnum.picture:
          return _.merge(SETTINGS_DEFAULT_PICTURE, tool)
        case ShapeEnum.polygon:
          return _.merge(SETTINGS_DEFAULT_POLYGON, tool)
        case ShapeEnum.rect:
          return _.merge(SETTINGS_DEFAULT_RECT, tool)
        case ShapeEnum.square:
          return _.merge(SETTINGS_DEFAULT_SQUARE, tool)
        case ShapeEnum.text:
          return _.merge(SETTINGS_DEFAULT_TEXT, tool)
      }
      return null
    }),
    _.compact
  )(tools) as unknown as CustomTool<ShapeEnum>[]
}
