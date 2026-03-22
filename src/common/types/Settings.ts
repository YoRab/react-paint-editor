import type { Point } from '@common/types/Shapes'

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
  selectionPadding: number
  size: 'infinite' | 'fixed'
  features: {
    zoom: boolean
    edition: boolean
  }
  debug: boolean
}
