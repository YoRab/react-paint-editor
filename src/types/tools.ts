import { ShapeEnum, ToolsSettingsType } from './Shapes'

export type CustomTool<T extends ShapeEnum> = {
  type: T
  icon?: string
  lib?: string
  settings: ToolsSettingsType<T>
}
