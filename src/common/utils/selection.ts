import type { SelectionType, ShapeEntity } from '@common/types/Shapes'
import type { CustomTool, ToolsGroupSettings } from '@common/types/tools'

export const getSelectedShapes = (selection: SelectionType | undefined): ShapeEntity[] => {
  if (!selection) return []
  return selection.type === 'group' ? selection.shapes : [selection]
}

export const getSelectedShapesTools = (selection: SelectionType | undefined, availableTools: CustomTool[]): CustomTool | undefined => {
  const selectedShapes = getSelectedShapes(selection)
  const tools = selectedShapes
    .map(shape => {
      return availableTools.find(tool => tool.id === shape?.toolId) || availableTools.find(tool => tool.type === shape?.type)
    })
    .filter(tool => tool !== undefined)
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
