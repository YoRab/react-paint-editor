import type { Size } from '@canvas/types/Canvas'
import type { ExportedDrawableShape } from '@canvas/types/Shapes'
import type { CustomToolInput } from '@canvas/types/tools'
import type { RecursivePartial } from '@canvas/types/utils'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_PADDING, SELECTION_DEFAULT_WIDTH } from './shapes'
import { DEFAULT_TOOLS } from './tools'

export const APP_NAME = 'react_paint'

export const DRAWCANVAS_CLASSNAME = 'react-paint-canvas-drawcanvas'
export const SELECTIONCANVAS_CLASSNAME = 'react-paint-canvas-selectioncanvas'

import type { BrushAlgo } from '@canvas/types/Settings'

export type { BrushAlgo, UtilsSettings } from '@canvas/types/Settings'

export type AppOptions = {
  grid: number
  canGrow: boolean
  canShrink: boolean
  availableTools: CustomToolInput[]
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

export type OptionalOptions = RecursivePartial<AppOptions>

export const DEFAULT_OPTIONS: AppOptions = {
  grid: 0,
  canGrow: false,
  canShrink: true,
  withContextMenu: true,
  availableTools: DEFAULT_TOOLS,
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

export type CanvasOptions = {
  canvasBackgroundColor?: string | undefined
  canvasSelectionColor?: string | undefined
  canvasSelectionWidth?: number | undefined
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
