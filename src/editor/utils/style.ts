import type { CustomTool, ShapeType } from '@canvas/index'
import { arrowIcon, brushIcon, circleIcon, curveIcon, groupIcon, pictureIcon, polygonIcon, squareIcon, textIcon } from '@editor/constants/icons'
import { TOOL_LABELS } from '@editor/constants/tools'

export const getShapePicture = (shape: ShapeType) => {
  switch (shape) {
    case 'brush':
      return brushIcon
    case 'line':
      return arrowIcon
    case 'polygon':
      return polygonIcon
    case 'curve':
      return curveIcon
    case 'rect':
      return squareIcon // temporary
    case 'square':
      return squareIcon
    case 'circle':
      return circleIcon
    case 'ellipse':
      return circleIcon // temporary
    case 'text':
      return textIcon
    case 'picture':
      return pictureIcon
    case 'group':
      return groupIcon
  }
}

export type DisplayTool = CustomTool & { icon: string; label: string }

/** Tools coming from the canvas may have no icon or label: they are resolved here from the tool type */
export const getDisplayTool = (tool: CustomTool): DisplayTool => ({
  ...tool,
  icon: tool.icon ?? getShapePicture(tool.type),
  label: tool.label ?? TOOL_LABELS[tool.type]
})
