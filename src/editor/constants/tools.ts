import { type ActionsTool, ERASER_TOOL, LASER_TOOL, MOVE_TOOL, SELECTION_TOOL } from '@canvas/index'
import type { EditorActionTool } from '@editor/types/tools'
import {
  clearIcon,
  cursorIcon,
  eraserIcon,
  exportFileIcon,
  laserIcon,
  moveIcon,
  openFileIcon,
  pictureIcon,
  redoIcon,
  saveIcon,
  undoIcon
} from './icons'

// display versions of the canvas tools: same id and type, with an icon. Their labels are the ones of the locale
export const SELECTION_TOOL_DISPLAY: ActionsTool = {
  ...SELECTION_TOOL,
  icon: cursorIcon
}

export const MOVE_TOOL_DISPLAY: ActionsTool = {
  ...MOVE_TOOL,
  icon: moveIcon
}

export const ERASER_TOOL_DISPLAY: ActionsTool = {
  ...ERASER_TOOL,
  icon: eraserIcon
}

export const LASER_TOOL_DISPLAY: ActionsTool = {
  ...LASER_TOOL,
  icon: laserIcon
}

export const UNDO_TOOL: EditorActionTool = {
  type: 'undo',
  icon: undoIcon
}

export const REDO_TOOL: EditorActionTool = {
  type: 'redo',
  icon: redoIcon
}

export const CLEAR_TOOL: EditorActionTool = {
  type: 'clear',
  icon: clearIcon
}

export const EXPORT_TOOL: EditorActionTool = {
  type: 'export',
  icon: exportFileIcon
}

/** Files accepted as a project by the buttons which load one */
export const PROJECT_FILE_ACCEPT = 'application/JSON'

export const LOAD_TOOL: EditorActionTool = {
  type: 'loadfile',
  icon: openFileIcon
}

export const SAVE_TOOL: EditorActionTool = {
  type: 'savefile',
  icon: saveIcon
}

export const UPLOAD_PICTURE_TOOL: EditorActionTool = {
  type: 'uploadpicture',
  icon: pictureIcon
}
