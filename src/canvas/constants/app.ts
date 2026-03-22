import type { Size } from '@common/types/Canvas'
import type { ExportedDrawableShape } from '@common/types/Shapes'
import type { CustomToolInput } from '@common/types/tools'
import type { RecursivePartial } from '@common/types/utils'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_PADDING, SELECTION_DEFAULT_WIDTH } from './shapes'

export const APP_NAME = 'react_paint'

export const DRAWCANVAS_CLASSNAME = 'react-paint-canvas-drawcanvas'
export const SELECTIONCANVAS_CLASSNAME = 'react-paint-canvas-selectioncanvas'

import type { BrushAlgo } from '@common/types/Settings'

export type { BrushAlgo, UtilsSettings } from '@common/types/Settings'

type AppOptionsType = {
  layersManipulation: boolean
  grid: number
  canGrow: boolean
  canShrink: boolean
  availableTools: CustomToolInput[]
  withExport: boolean
  withLoadAndSave: boolean
  withUploadPicture: boolean
  withUrlPicture: boolean
  withFrameSelection: boolean
  withSkeleton: boolean
  withContextMenu: boolean
  clearCallback: 'empty' | 'defaultShapes' | (() => ExportedDrawableShape[])
  brushAlgo: BrushAlgo
  isBrushShapeDoneOnMouseUp: boolean
  canvasSelectionPadding: number
  size: Size
  canZoom: 'never' | 'always'
  debug: boolean
}

export type OptionalOptions = RecursivePartial<AppOptionsType>

export const DEFAULT_OPTIONS: AppOptionsType = {
  layersManipulation: true,
  grid: 0,
  canGrow: false,
  canShrink: true,
  withExport: true,
  withLoadAndSave: true,
  withUploadPicture: true,
  withUrlPicture: false,
  withContextMenu: true,
  availableTools: [],
  clearCallback: 'empty',
  brushAlgo: 'simple',
  isBrushShapeDoneOnMouseUp: true,
  withFrameSelection: true,
  withSkeleton: true,
  canvasSelectionPadding: SELECTION_DEFAULT_PADDING,
  size: 'fixed',
  canZoom: 'never',
  debug: false
}

export const DEFAULT_CANVAS_OPTIONS: {
  canvasBackgroundColor: string
  canvasSelectionColor: string
  canvasSelectionWidth: number
} = {
  canvasBackgroundColor: 'white',
  canvasSelectionColor: SELECTION_DEFAULT_COLOR,
  canvasSelectionWidth: SELECTION_DEFAULT_WIDTH
}
