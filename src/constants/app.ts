import type { DrawableShapeJson } from '../types/Shapes'
import type { CustomToolInput } from '../types/tools'
import type { RecursivePartial } from '../types/utils'
import {
  SELECTION_DEFAULT_COLOR,
  SELECTION_DEFAULT_PADDING,
  SELECTION_DEFAULT_WIDTH
} from './shapes'
import { DEFAULT_SHAPE_TOOLS } from './tools'

export const APP_NAME = 'react_paint'

export const DRAWCANVAS_CLASSNAME = 'react-paint-editor-canvas-drawcanvas'
export const SELECTIONCANVAS_CLASSNAME = 'react-paint-editor-canvas-selectioncanvas'

export const GRID_NONE = 0
export const GRID_SMALL = 1
export const GRID_MEDIUM = 2
export const GRID_LARGE = 3

export type GridFormatType =
  | typeof GRID_NONE
  | typeof GRID_SMALL
  | typeof GRID_MEDIUM
  | typeof GRID_LARGE

type AppOptionsType = {
  layersManipulation: boolean
  grid: GridFormatType
  canGrow: boolean
  canShrink: boolean
  availableTools: CustomToolInput[]
  withExport: boolean
  withLoadAndSave: boolean
  withUploadPicture: boolean
  withUrlPicture: boolean
  clearCallback: 'empty' | 'defaultShapes' | (() => DrawableShapeJson[])
  uiStyle: {
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
    canvasBackgroundColor: string
    canvasSelectionColor: string
    canvasSelectionWidth: number
    canvasSelectionPadding: number
  }
}

export type OptionalAppOptionsType = RecursivePartial<AppOptionsType>

export const DEFAULT_OPTIONS: AppOptionsType = {
  layersManipulation: true,
  grid: GRID_NONE,
  canGrow: false,
  canShrink: true,
  withExport: true,
  withLoadAndSave: true,
  withUploadPicture: true,
  withUrlPicture: false,
  availableTools: DEFAULT_SHAPE_TOOLS,
  clearCallback: 'empty',
  uiStyle: {
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
    canvasBackgroundColor: 'white',
    canvasSelectionColor: SELECTION_DEFAULT_COLOR,
    canvasSelectionWidth: SELECTION_DEFAULT_WIDTH,
    canvasSelectionPadding: SELECTION_DEFAULT_PADDING
  }
}
