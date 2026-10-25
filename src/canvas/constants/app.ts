import type { Resize, Size } from '@canvas/types/Canvas'
import type { ShapeInput } from '@canvas/types/Shapes'
import type { CustomToolInput } from '@canvas/types/tools'
import type { RecursivePartial } from '@canvas/types/utils'
import { SELECTION_DEFAULT_COLOR, SELECTION_DEFAULT_PADDING, SELECTION_DEFAULT_WIDTH } from './shapes'
import { DEFAULT_TOOLS } from './tools'

export const APP_NAME = 'react_paint'

export const DRAWCANVAS_CLASSNAME = 'react-paint-canvas-drawcanvas'
export const SELECTIONCANVAS_CLASSNAME = 'react-paint-canvas-selectioncanvas'

import type { BrushAlgo } from '@canvas/types/Settings'

export type { BrushAlgo, UtilsSettings } from '@canvas/types/Settings'

/** Largest data file read by loadFile, in bytes */
export const DATA_FILE_MAX_SIZE = 100 * 1024 * 1024

/**
 * Receives the absolute URL of a remote picture before it is fetched, and returns the URL to fetch instead, or null to
 * refuse the picture. The source kept in the shape and in the exported data is not changed
 */
export type PictureSrcResolver = (url: string) => string | null | Promise<string | null>

export type AppOptions = {
  grid: number
  availableTools: CustomToolInput[]
  withFrameSelection: boolean
  withSkeleton: boolean
  withContextMenu: boolean
  /** Adds the image files dropped on the canvas as pictures, when the picture tool is available */
  withDropPicture: boolean
  clearCallback: 'empty' | 'defaultShapes' | (() => ShapeInput[])
  /** Filters or rewrites the URLs of the remote pictures, which may come from data drawn by someone else */
  resolvePictureSrc: PictureSrcResolver | undefined
  brushAlgo: BrushAlgo
  isBrushShapeDoneOnMouseUp: boolean
  canvasSelectionPadding: number
  size: Size
  /**
   * 'scaleDown', 'scale', 'scaleUp' and 'none' keep the width and the height and show the whole drawing, scaled to the
   * width of the container within their bounds. 'extend' fills the container at the scale 1: the visible area follows it
   */
  resize: Resize
  /** Always 'always' with an infinite size */
  canZoom: 'never' | 'always'
  debug: boolean
}

export type OptionalOptions = RecursivePartial<AppOptions>

export const DEFAULT_OPTIONS: AppOptions = {
  grid: 0,
  withContextMenu: true,
  withDropPicture: true,
  availableTools: DEFAULT_TOOLS,
  clearCallback: 'empty',
  resolvePictureSrc: undefined,
  brushAlgo: 'simple',
  isBrushShapeDoneOnMouseUp: true,
  withFrameSelection: true,
  withSkeleton: true,
  canvasSelectionPadding: SELECTION_DEFAULT_PADDING,
  size: 'fixed',
  resize: 'scaleDown',
  canZoom: 'never',
  debug: false
}

export type CanvasOptions = {
  canvasBackgroundColor?: string | undefined
  canvasSelectionColor?: string | undefined
  canvasSelectionWidth?: number | undefined
  /** Color of the trail of the laser pointer */
  canvasLaserColor?: string | undefined
  /** Width of the trail of the laser pointer at its newest point, in pixels of the screen: it narrows as it fades out */
  canvasLaserWidth?: number | undefined
}

export const DEFAULT_CANVAS_OPTIONS: {
  canvasBackgroundColor: string
  canvasSelectionColor: string
  canvasSelectionWidth: number
  canvasLaserColor: string
  canvasLaserWidth: number
} = {
  canvasBackgroundColor: 'white',
  canvasSelectionColor: SELECTION_DEFAULT_COLOR,
  canvasSelectionWidth: SELECTION_DEFAULT_WIDTH,
  canvasLaserColor: '#ff2d2d',
  canvasLaserWidth: 6
}
