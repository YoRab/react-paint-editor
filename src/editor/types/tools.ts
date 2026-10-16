/** Buttons of the toolbar which trigger an action of the editor: unlike the tools, the canvas does not know them */
export type EditorActionType = 'undo' | 'redo' | 'clear' | 'export' | 'loadfile' | 'savefile' | 'uploadpicture'

export type EditorActionTool = {
  type: EditorActionType
  icon: string
  label: string
}
