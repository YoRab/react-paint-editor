import { DEFAULT_TOOLS } from '@canvas/constants/tools'
import type { CustomTool, CustomToolInput } from '@common/types/tools'
import type { RecursivePartial } from '@common/types/utils'
import { compact } from '@common/utils/array'
import { mergeWith } from '@common/utils/object'

const arrayOverrideCustomizer = (objValue: unknown, srcValue: unknown) => {
  if (Array.isArray(objValue)) return srcValue
}

/**
 * Builds the tools list used by the canvas. Each partial tool is merged with the default tool of the same type,
 * arrays (like color values) being replaced instead of merged. Without input, default tools are returned.
 */
export const buildAvailableTools = (tools: RecursivePartial<CustomToolInput>[] | undefined): CustomTool[] => {
  if (!tools) return DEFAULT_TOOLS
  return compact(
    tools.map(tool => {
      if (typeof tool !== 'object' || !tool.type) return null
      const defaultTool = DEFAULT_TOOLS.find(d => d.type === tool.type)
      return defaultTool ? (mergeWith(arrayOverrideCustomizer, defaultTool, tool) as CustomTool) : (tool as CustomTool)
    })
  )
}
