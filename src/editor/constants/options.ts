type EditorOptionsType = {
  toolbarBackgroundColor: string
  dividerColor: string
  fontRadius: number
  fontDisabledColor: string
  fontDisabledBackgroundColor: string
  fontColor: string
  fontBackgroundColor: string
  fontSelectedColor: string
  fontSelectedBackgroundColor: string
  fontHoverColor: string
  fontHoverBackgroundColor: string
  layersManipulation: boolean
  withExport: boolean
  withLoadAndSave: boolean
  withUploadPicture: boolean
  withUrlPicture: boolean
  /** Shows the eraser, which removes the shapes it crosses */
  withEraser: boolean
  /** Shows the laser pointer, whose trail fades out without changing the drawing */
  withLaser: boolean
  /** Shows the map of the drawing under the buttons of the zoom panel */
  withMinimap: boolean
}

export type EditorOptions = {
  [K in keyof EditorOptionsType]?: EditorOptionsType[K] | undefined
}

export const DEFAULT_EDITOR_OPTIONS: EditorOptionsType = {
  toolbarBackgroundColor: 'white',
  dividerColor: '#36418129',
  fontRadius: 8,
  fontDisabledColor: '#3641812b',
  fontDisabledBackgroundColor: 'transparent',
  fontColor: '#364181',
  fontBackgroundColor: 'transparent',
  fontSelectedColor: 'white',
  fontSelectedBackgroundColor: '#364181',
  fontHoverColor: '#364181',
  fontHoverBackgroundColor: '#afd8d8',
  layersManipulation: true,
  withExport: true,
  withLoadAndSave: true,
  withUploadPicture: true,
  withUrlPicture: false,
  withEraser: false,
  withLaser: false,
  withMinimap: true
}
