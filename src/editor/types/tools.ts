import type { ReactNode } from 'react'

/** Buttons of the toolbar which trigger an action of the editor: unlike the tools, the canvas does not know them */
export type EditorActionType = 'undo' | 'redo' | 'clear' | 'export' | 'loadfile' | 'savefile' | 'uploadpicture'

/** A button of an action: its label is the one of the locale of the editor */
export type EditorActionTool = {
  type: EditorActionType
  icon: ReactNode
}
