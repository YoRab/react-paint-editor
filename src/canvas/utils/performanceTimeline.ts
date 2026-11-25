import type { ReactPaint } from '@canvas/types/editor'
import { roundValues } from '@canvas/utils/transform'

/** Where the Performance panel of Chrome shows a measure: a track of the React Paint group, its color and its fields */
type TrackEntry = { track: string; color: 'primary' | 'secondary' | 'error'; properties: [string, string | number][] }

/**
 * Adds a measure to the performance timeline. Its detail keeps the fields of the measure, and tells the Performance panel
 * of Chrome where to show it, the other browsers leaving that out. The listeners of frameDrawn run in the draw of the
 * canvas: a measure which throws is left out, so that the profiling never stops a draw
 */
const addMeasure = <M extends { startTime: number; duration: number }>(name: string, measure: M, entry: TrackEntry) => {
  try {
    performance.measure(name, {
      start: measure.startTime,
      duration: measure.duration,
      detail: { ...measure, devtools: { dataType: 'track-entry', trackGroup: 'React Paint', ...entry } }
    })
  } catch {}
}

/**
 * Adds the draws of the layers of the canvas and its gestures to the performance timeline of the browser, as the
 * measures 'react-paint draw shapes' or 'react-paint gesture translate', which the Performance panel of the browser shows.
 * The browser keeps them until performance.clearMeasures(): connect it while profiling. Returns the function that stops it
 */
export const connectPerformanceTimeline = (paint: Pick<ReactPaint, 'registerEvent'>): (() => void) => {
  const stopFrames = paint.registerEvent('frameDrawn', frame =>
    addMeasure(`react-paint draw ${frame.layer}`, frame, {
      track: 'Draws',
      color: 'secondary',
      properties: [
        ['Shapes drawn', frame.drawnShapes],
        ['Shapes out of the view', frame.culledShapes],
        ['Shapes on a layer', frame.layeredShapes],
        ['Pixels', `${frame.pixelWidth} × ${frame.pixelHeight}`]
      ]
    })
  )
  const stopGestures = paint.registerEvent('gestureMeasured', gesture =>
    addMeasure(`react-paint gesture ${gesture.type}`, gesture, {
      track: 'Gestures',
      color: gesture.longFrames ? 'error' : 'primary',
      properties: [
        ['Frames per second', roundValues(gesture.fps, 1)],
        ['Frame interval p95 (ms)', roundValues(gesture.frameIntervals.p95, 1)],
        ['Long frames', gesture.longFrames],
        ['Shapes', gesture.shapeCount],
        ['Selected shapes', gesture.selectedCount]
      ]
    })
  )
  return () => {
    stopFrames()
    stopGestures()
  }
}
