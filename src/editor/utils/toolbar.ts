import type { CustomTool, ShapeType } from '@canvas/index'
import { compact } from '@editor/utils/util'

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
      // a group without any available tool is not shown, and takes no room in the toolbar
      if (!toolsType.length) return null
      return { ...group, toolsType }
    }
  )
  return compact(structure)
}
