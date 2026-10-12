import { MOVE_TOOL, SELECTION_TOOL, TOOL_ID_PREFIX } from '@common/constants/tools'
import type { ShapeType } from '@common/types/Shapes'
import type { ActionsTool } from '@common/types/tools'
import { clearIcon, cursorIcon, exportFileIcon, moveIcon, openFileIcon, pictureIcon, redoIcon, saveIcon, undoIcon } from './icons'

export const TOOL_LABELS: Record<ShapeType, string> = {
  brush: 'Brosse',
  line: 'Ligne',
  polygon: 'Polygone',
  curve: 'Courbe',
  rect: 'Rectangle',
  square: 'Carré',
  circle: 'Cercle',
  ellipse: 'Ellipse',
  picture: 'Image',
  text: 'Texte',
  triangle: 'Triangle',
  group: 'Groupe'
}

// display versions of the canvas tools: same id and type, with an icon and a label
export const SELECTION_TOOL_DISPLAY: ActionsTool = {
  ...SELECTION_TOOL,
  icon: cursorIcon,
  label: 'Sélection'
}

export const MOVE_TOOL_DISPLAY: ActionsTool = {
  ...MOVE_TOOL,
  icon: moveIcon,
  label: 'Move'
}

export const UNDO_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}undo`,
  type: 'undo',
  icon: undoIcon,
  label: 'Undo'
}

export const REDO_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}redo`,
  type: 'redo',
  icon: redoIcon,
  label: 'Redo'
}

export const CLEAR_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}clear`,
  type: 'clear',
  icon: clearIcon,
  label: 'Clear'
}

export const EXPORT_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}export`,
  type: 'export',
  icon: exportFileIcon,
  label: 'Export PNG'
}

export const LOAD_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}load`,
  type: 'loadfile',
  icon: openFileIcon,
  label: 'Load project'
}

export const SAVE_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}save`,
  type: 'savefile',
  icon: saveIcon,
  label: 'Save project'
}

export const UPLOAD_PICTURE_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}upload-picture`,
  type: 'uploadpicture',
  icon: pictureIcon,
  label: 'Upload picture'
}
