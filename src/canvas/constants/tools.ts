import type { ActionsTool, ToolsRectSettings } from '@common/types/tools'

export const SELECTION_TOOL: ActionsTool = {
  id: 'react-paint-selection',
  type: 'selection',
  icon: '',
  label: ''
}

export const PICTURE_TOOL_ID = 'react-paint-picture'

export const CANVAS_DEFAULT_RECT_SETTINGS: ToolsRectSettings = {
  strokeColor: {
    values: [],
    default: 'black'
  },
  fillColor: {
    values: [],
    default: 'transparent'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: [],
    default: 0
  }
}
