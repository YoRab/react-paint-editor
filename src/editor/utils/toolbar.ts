import type { ShapeType } from '@common/types/Shapes'
import type { CustomTool } from '@common/types/tools'
import { compact } from '@common/utils/array'

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
): (
  | CustomTool
  | {
      title: string
      toolsType: CustomTool[]
      vertical: boolean
    }
)[] => {
  const structure = defaultStructure.flatMap(
    (
      group
    ):
      | CustomTool
      | CustomTool[]
      | {
          toolsType: CustomTool[]
          title: string
          vertical: boolean
        }
      | null => {
      if (typeof group !== 'object') {
        return availableTools.filter(tool => tool.type === group)
      }
      const toolsType = availableTools.filter(tool => group.toolsType.includes(tool.type))
      if (!toolsType) return null
      return { ...group, toolsType }
    }
  )
  return compact(structure)
}
