import type { Point } from '@canvas/types/Shapes'

export type BrushAlgo = 'simple' | 'quadratic'

export type UtilsSettings = {
  brushAlgo: BrushAlgo
  isBrushShapeDoneOnMouseUp: boolean
  gridGap: number
  canvasOffset: Point
  canvasZoom: number
  canvasSize: {
    realWidth: number
    realHeight: number
    width: number
    height: number
    scaleRatio: number
    scaleRatioWithNoZoom: number
  }
  /** Logical size of the drawing: its limits when its size is fixed. canvasSize.realWidth is the visible area at zoom 1 */
  drawingSize: { width: number; height: number }
  selectionPadding: number
  size: 'infinite' | 'fixed'
  features: {
    zoom: boolean
    edition: boolean
  }
  debug: boolean
}
