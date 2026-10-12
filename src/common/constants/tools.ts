import type { ActionsTool } from '@common/types/tools'

export const TOOL_ID_PREFIX = 'react-paint-'

/**
 * Tools handled by the canvas besides the drawing tools. Like them, they hold no visual data:
 * an editor gives them an icon and a label, and selects them by id.
 */
export const SELECTION_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}selection`,
  type: 'selection'
}

export const MOVE_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}move`,
  type: 'move'
}
