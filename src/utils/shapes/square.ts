import _ from 'lodash/fp'
import type { Point, DrawableSquare } from 'types/Shapes'
import type { ToolsSettingsType } from 'types/tools'

export const createSquare = (
  shape: {
    id: string
    icon: string
    label: string
    type: 'square'
    settings: ToolsSettingsType<'square'>
  },
  cursorPosition: Point
): DrawableSquare | undefined => {
  return {
    toolId: shape.id,
    type: shape.type,
    id: _.uniqueId(`${shape.type}_`),
    x: cursorPosition[0],
    y: cursorPosition[1],
    width: 1,
    height: 1,
    rotation: 0,
    style: {
      globalAlpha: shape.settings.opacity.default,
      fillColor: shape.settings.fillColor.default,
      strokeColor: shape.settings.strokeColor.default,
      lineWidth: shape.settings.lineWidth.default,
      lineDash: shape.settings.lineDash.default
    }
  }
}
