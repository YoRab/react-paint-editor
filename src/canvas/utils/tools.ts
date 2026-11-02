import { TOOL_SHAPE_FIELDS } from '@canvas/constants/shapes'
import { DEFAULT_TOOLS, SETTINGS_DEFAULT_CUSTOM } from '@canvas/constants/tools'
import type { DrawableShape, ShapeType, StyleShape } from '@canvas/types/Shapes'
import type { CustomTool, CustomToolInput } from '@canvas/types/tools'
import type { RecursivePartial } from '@canvas/types/utils'
import { compact } from '@canvas/utils/array'
import { isRecord, mergeWith, replaceArrays } from '@canvas/utils/object'

/** Default settings of the types which have no default tool: a custom tool may give only some of them */
const DEFAULT_SETTINGS_BY_TYPE: Partial<Record<ShapeType, object>> = {
  custom: { settings: SETTINGS_DEFAULT_CUSTOM }
}

/** Whether a custom tool can draw: its shape must give a path and a view box with positive sides */
const hasCustomShape = (tool: Record<string, unknown>): boolean => {
  const { shape } = tool
  if (!isRecord(shape)) return false
  if (typeof shape.path !== 'function' && !(typeof shape.path === 'string' && shape.path.length > 0)) return false
  const { viewBox } = shape
  if (!Array.isArray(viewBox) || viewBox.length !== 4 || viewBox.some(value => typeof value !== 'number' || !Number.isFinite(value))) return false
  return viewBox[2] > 0 && viewBox[3] > 0
}

/**
 * Builds the tools list used by the canvas. Each partial tool is merged with the default tool of the same type, or with
 * the default settings of its type when it has none, arrays (like color values) being replaced instead of merged. A
 * custom tool whose shape cannot be drawn is left out, with a warning. Without input, default tools are returned.
 */
export const buildAvailableTools = (tools: RecursivePartial<CustomToolInput>[] | undefined): CustomTool[] => {
  if (!tools) return DEFAULT_TOOLS
  return compact(
    tools.map(tool => {
      if (!isRecord(tool) || !tool.type) return null
      if (tool.type === 'custom' && !hasCustomShape(tool)) {
        console.warn(`react-paint: the custom tool "${String(tool.id)}" is left out, its shape must give a path and a view box`)
        return null
      }
      const defaults = DEFAULT_TOOLS.find(d => d.type === tool.type) ?? DEFAULT_SETTINGS_BY_TYPE[tool.type as ShapeType]
      return defaults ? (mergeWith(replaceArrays, defaults, tool) as CustomTool) : (tool as CustomTool)
    })
  )
}

/** The tool of a shape: the one it was drawn with, or else the first tool of its type */
export const findShapeTool = (tools: CustomTool[], shape: Pick<DrawableShape, 'toolId' | 'type'>): CustomTool | undefined =>
  tools.find(tool => tool.id === shape.toolId) ?? tools.find(tool => tool.type === shape.type)

/** Whether a picture tool is a sticker, drawn with its own image on a press, and not the one used to upload a picture */
export const isStickerTool = <T extends { type: string; src?: string }>(tool: T): tool is T & { src: string } => tool.type === 'picture' && !!tool.src

/** Whether a picture tool opens a file, a drop or a URL, instead of drawing its own image like a sticker */
export const isUploadPictureTool = (tool: { type: string; src?: string }): boolean => tool.type === 'picture' && !tool.src

/** Style made of the default values of the settings of a tool, without the ones giving a field of the shapes */
export const getToolDefaultStyle = (tool: { settings?: object } | undefined): StyleShape => {
  const style: Record<string, unknown> = {}
  for (const [field, setting] of Object.entries(tool?.settings ?? {})) {
    if (isRecord(setting) && setting.default !== undefined && !TOOL_SHAPE_FIELDS.includes(field)) style[field] = setting.default
  }
  return style as StyleShape
}
