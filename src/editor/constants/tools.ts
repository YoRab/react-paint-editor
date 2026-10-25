import { type ActionsTool, MOVE_TOOL, SELECTION_TOOL, type ShapeType } from '@canvas/index'
import type { EditorActionTool } from '@editor/types/tools'
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

export const UNDO_TOOL: EditorActionTool = {
  type: 'undo',
  icon: undoIcon,
  label: 'Undo'
}

export const REDO_TOOL: EditorActionTool = {
  type: 'redo',
  icon: redoIcon,
  label: 'Redo'
}

export const CLEAR_TOOL: EditorActionTool = {
  type: 'clear',
  icon: clearIcon,
  label: 'Clear'
}

export const EXPORT_TOOL: EditorActionTool = {
  type: 'export',
  icon: exportFileIcon,
  label: 'Export PNG'
}

export const LOAD_TOOL: EditorActionTool = {
  type: 'loadfile',
  icon: openFileIcon,
  label: 'Load project'
}

export const SAVE_TOOL: EditorActionTool = {
  type: 'savefile',
  icon: saveIcon,
  label: 'Save project'
}

export const UPLOAD_PICTURE_TOOL: EditorActionTool = {
  type: 'uploadpicture',
  icon: pictureIcon,
  label: 'Upload picture'
}
