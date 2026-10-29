import type { SelectionType, ShapeEntity } from '@canvas/types/Shapes'
import type { CustomTool, ToolsGroupSettings } from '@canvas/types/tools'
import { compact } from '@canvas/utils/array'
import { getShapeLeaves } from '@canvas/utils/shapes/tree'
import { findShapeTool } from '@canvas/utils/tools'

export const getSelectedShapes = (selection: SelectionType | undefined): ShapeEntity[] => {
  if (!selection) return []
  return selection.type === 'multiSelection' ? selection.shapes : [selection]
}

/**
 * The tool of the shapes drawn by the selection, the shapes of its groups, or a tool of the settings they share when they
 * have several tools. Each tool is read once: the shapes of a large group share a few tools
 */
export const getSelectedShapesTools = (selection: SelectionType | undefined, availableTools: CustomTool[]): CustomTool | undefined => {
  const tools = [...new Set(compact(getShapeLeaves(getSelectedShapes(selection)).map(shape => findShapeTool(availableTools, shape))))]
  if (!tools.length) return undefined
  if (tools.length === 1) return tools[0]

  type SettingField = { hidden?: boolean; min?: number; max?: number; step?: number; values?: unknown[]; default?: unknown }

  const settings = tools.slice(1)!.reduce<Record<string, SettingField>>(
    (settingsAcc, tool) => {
      const newSettings: Record<string, SettingField> = {}
      for (const key in tool.settings) {
        if (settingsAcc[key] === undefined) continue
        const accSet = settingsAcc[key]
        const newSet = (tool.settings as Record<string, SettingField>)[key]!
        if (accSet.hidden || newSet?.hidden) continue

        const fieldSettings: SettingField = {}

        if (
          'min' in newSet &&
          'min' in accSet &&
          newSet.min === accSet.min &&
          'max' in newSet &&
          'max' in accSet &&
          newSet.max === accSet.max &&
          'step' in newSet &&
          'step' in accSet &&
          newSet.step === accSet.step
        ) {
          fieldSettings.min = newSet.min
          fieldSettings.max = newSet.max
          fieldSettings.step = newSet.step
        }

        if ('values' in newSet && 'values' in accSet && newSet.values?.join(',') === accSet.values?.join(',')) {
          fieldSettings.values = newSet.values
        }

        if (Object.keys(fieldSettings).length > 0 || key === 'closedPoints') {
          newSettings[key] = fieldSettings
        }
      }
      return newSettings
    },
    tools[0]!.settings as Record<string, SettingField>
  )

  return {
    id: tools.map(tool => tool.id).join('-'),
    icon: '',
    label: 'group',
    type: 'group',
    settings: settings as ToolsGroupSettings
  }
}
