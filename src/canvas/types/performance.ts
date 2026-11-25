/** A layer of the canvas, drawn at most once per frame: the shapes, or the selection over them with its anchors */
export type CanvasLayer = 'shapes' | 'selection'

/**
 * A draw of a layer of the canvas, given by frameDrawn. Its duration is the time of the JavaScript of the draw: the
 * browser paints the canvas later, in the frame
 */
export type FrameMeasure = {
  layer: CanvasLayer
  /** Start of the draw, in the time of performance.now() */
  startTime: number
  /** Duration of the draw, in milliseconds */
  duration: number
  /** Shapes drawn, the shapes of the groups and not the groups. 0 for the layer of the selection */
  drawnShapes: number
  /** Shapes left out because they are out of the view, a group with its shapes counting as one */
  culledShapes: number
  /**
   * Shapes and groups painted first on an offscreen layer because of their opacity, then copied on the canvas: each of
   * them costs a copy of its box
   */
  layeredShapes: number
  /** Size of the layer in pixels of the canvas: its size on the screen by the density */
  pixelWidth: number
  pixelHeight: number
  /** Pixels of the canvas in a pixel of the screen */
  pixelRatio: number
}

/** A gesture measured by gestureMeasured: a drag of the pointer, or the changes of the view until they pause */
export type GestureType = 'translate' | 'resize' | 'rotate' | 'selectionFrame' | 'brush' | 'eraser' | 'laser' | 'pan' | 'zoom'

/** The draws of a layer during a gesture */
export type LayerMeasure = {
  draws: number
  /** Sum of the durations of the draws, in milliseconds */
  totalDuration: number
  /** Duration of the longest draw, in milliseconds */
  maxDuration: number
}

/** A gesture, given by gestureMeasured once it ends */
export type GestureMeasure = {
  type: GestureType
  /** Start of the gesture, in the time of performance.now() */
  startTime: number
  /** Duration of the gesture, in milliseconds */
  duration: number
  /** Animation frames of the browser during the gesture */
  frames: number
  /** Frames per second during the gesture, 0 when it lasted less than a frame */
  fps: number
  /** Intervals between the frames, in milliseconds: their median, their 95th percentile and the longest one */
  frameIntervals: { p50: number; p95: number; max: number }
  /** Intervals between the frames longer than 50 ms, which the user sees as a stutter */
  longFrames: number
  shapesLayer: LayerMeasure
  selectionLayer: LayerMeasure
  /** Shapes of the drawing when the gesture starts, the shapes of the groups and not the groups */
  shapeCount: number
  /** Shapes selected when the gesture starts, the shapes of the groups and not the groups */
  selectedCount: number
  /** Zoom of the view when the gesture ends */
  zoom: number
  /** Pixels of the canvas in a pixel of the screen */
  pixelRatio: number
}
