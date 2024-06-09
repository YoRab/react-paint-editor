import type { DrawableShape, Point } from '@common/types/Shapes'
import type { CustomToolInput } from '@common/types/tools'
import type { RecursivePartial } from '@common/types/utils'
import { DEFAULT_SHAPE_TOOLS } from '@editor/constants/tools'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_PADDING, SELECTION_DEFAULT_WIDTH } from './shapes'

export const APP_NAME = 'react_paint'

export const DRAWCANVAS_CLASSNAME = 'react-paint-canvas-drawcanvas'
export const SELECTIONCANVAS_CLASSNAME = 'react-paint-canvas-selectioncanvas'

export type BrushAlgo = 'simple' | 'quadratic'

export type UtilsSettings = {
  brushAlgo: BrushAlgo
  gridGap: number
  canvasOffset: Point
  canvasSize: {
    width: number
    height: number
    scaleRatio: number
  }
  selectionPadding: number
}
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
  clearCallback: 'empty' | 'defaultShapes' | (() => DrawableShape[])
  brushAlgo: BrushAlgo
  canvasSelectionPadding: number
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
  availableTools: DEFAULT_SHAPE_TOOLS,
  clearCallback: 'empty',
  brushAlgo: 'simple',
  withFrameSelection: false,
  withSkeleton: false,
  canvasSelectionPadding: SELECTION_DEFAULT_PADDING
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
