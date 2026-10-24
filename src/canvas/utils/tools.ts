import { DEFAULT_TOOLS } from '@canvas/constants/tools'
import type { DrawableShape, StyleShape } from '@canvas/types/Shapes'
import type { CustomTool, CustomToolInput } from '@canvas/types/tools'
import type { RecursivePartial } from '@canvas/types/utils'
import { compact } from '@canvas/utils/array'
import { isRecord, mergeWith, replaceArrays } from '@canvas/utils/object'

/**
 * Builds the tools list used by the canvas. Each partial tool is merged with the default tool of the same type,
 * arrays (like color values) being replaced instead of merged. Without input, default tools are returned.
 */
export const buildAvailableTools = (tools: RecursivePartial<CustomToolInput>[] | undefined): CustomTool[] => {
  if (!tools) return DEFAULT_TOOLS
  return compact(
    tools.map(tool => {
      if (!isRecord(tool) || !tool.type) return null
      const defaultTool = DEFAULT_TOOLS.find(d => d.type === tool.type)
      return defaultTool ? (mergeWith(replaceArrays, defaultTool, tool) as CustomTool) : (tool as CustomTool)
    })
  )
}

/** The tool of a shape: the one it was drawn with, or else the first tool of its type */
export const findShapeTool = (tools: CustomTool[], shape: Pick<DrawableShape, 'toolId' | 'type'>): CustomTool | undefined =>
  tools.find(tool => tool.id === shape.toolId) ?? tools.find(tool => tool.type === shape.type)

/** Style made of the default values of the settings of a tool */
export const getToolDefaultStyle = (tool: { settings?: object } | undefined): StyleShape => {
  const style: Record<string, unknown> = {}
  for (const [field, setting] of Object.entries(tool?.settings ?? {})) {
    if (isRecord(setting) && setting.default !== undefined) style[field] = setting.default
  }
  return style as StyleShape
}
