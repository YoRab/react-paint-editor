import { ShapeEnum } from 'types/Shapes'
import _ from 'lodash/fp'

export const getCurrentStructure = (
  availableTools: ShapeEnum[],
  defaultStructure: (
    | ShapeEnum
    | {
        title: string
        img: string
        tools: ShapeEnum[]
        vertical: boolean
      }
  )[]
) => {
  return _.flow(
    _.map(
      (
        group: ShapeEnum | { title: string; vertical: boolean; img: string; tools: ShapeEnum[] }
      ) => {
        if (!_.isObject(group)) {
          if (_.includes(group, availableTools)) {
            return group
          }
          return null
        }
        const tools = _.intersection(availableTools, group.tools)
        if (!tools) return null
        return { ...group, tools }
      }
    ),
    _.compact
  )(defaultStructure)
}
