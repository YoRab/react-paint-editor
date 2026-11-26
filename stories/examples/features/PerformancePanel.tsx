import { type CSSProperties, Fragment, useEffect, useState } from 'react'
import type { CanvasLayer, FrameMeasure, GestureMeasure, ReactPaint } from '../../../src/index'

/** The panel shows the frames and the draws of the last second */
const WINDOW_MS = 1000
/** The panel refreshes 4 times a second */
const REFRESH_MS = 250
/** The highest rate is read from nearly a second of frames only: a few frames close together give a rate never reached */
const MIN_WINDOW_FOR_MAX_MS = 900
/** A frame longer than this is a stutter the user sees, like the long frames of gestureMeasured */
const SLOW_FRAME_MS = 50

type Field = { term: string; value: string; isSlow?: boolean }

const formatCount = (count: number) => count.toLocaleString('en')
const formatMs = (duration: number) => `${duration.toFixed(1)} ms`

/** The draws of a layer in the last second, and its last draw, still shown once the canvas no longer draws */
const formatLayer = (draws: FrameMeasure[], last: FrameMeasure | undefined) => {
  if (!last) return '-'
  const worst = draws.length ? [`worst ${formatMs(Math.max(...draws.map(draw => draw.duration)))}`] : []
  return [`${draws.length} draws/s`, `last ${formatMs(last.duration)}`, ...worst].join(' · ')
}

const formatShapes = (frame: FrameMeasure | undefined) =>
  frame
    ? `${formatCount(frame.drawnShapes)} drawn · ${formatCount(frame.culledShapes)} out of the view · ${formatCount(frame.layeredShapes)} on a layer`
    : '-'

const formatCanvas = (frame: FrameMeasure | undefined) =>
  frame ? `${formatCount(frame.pixelWidth)} × ${formatCount(frame.pixelHeight)} px · density ${frame.pixelRatio}` : '-'

/** The last gesture, its frames and the draws of the layers during it, on short lines: they never widen the panel */
const formatGesture = (gesture: GestureMeasure | undefined): Field[] => [
  {
    term: 'Last gesture',
    value: gesture
      ? `${gesture.type} · ${(gesture.duration / 1000).toFixed(2)} s · ${formatCount(gesture.shapeCount)} shapes, ${formatCount(gesture.selectedCount)} selected`
      : '-'
  },
  {
    term: 'Its frames',
    value: gesture ? `${Math.round(gesture.fps)} fps · p95 ${formatMs(gesture.frameIntervals.p95)} · ${gesture.longFrames} long frames` : '-'
  },
  {
    term: 'Its draws',
    value: gesture
      ? `shapes ${gesture.shapesLayer.draws}, worst ${formatMs(gesture.shapesLayer.maxDuration)} · selection ${gesture.selectionLayer.draws}, worst ${formatMs(gesture.selectionLayer.maxDuration)}`
      : '-'
  }
]

const panelStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  gap: '2px 12px',
  margin: '0 0 8px',
  padding: '8px 12px',
  font: '12px/1.5 ui-monospace, Menlo, Consolas, monospace',
  color: '#333',
  background: '#fafafa',
  border: '1px solid #e0e0e0',
  borderRadius: 6
}
const termStyle: CSSProperties = { color: '#666' }
const valueStyle: CSSProperties = { margin: 0 }
const slowValueStyle: CSSProperties = { ...valueStyle, color: '#c62828', fontWeight: 600 }

/**
 * The frames of the browser, the draws of the layers of the canvas and the last gesture, read from the events
 * frameDrawn and gestureMeasured. Its loop of frames counts the frames shown by the browser, which drop when the main
 * thread is busy, and the panel refreshes 4 times a second. While it listens to them, the canvas measures its draws and
 * its gestures, which costs a few percent of the time of its frames: show it while profiling
 */
export const PerformancePanel = ({ paint }: { paint: Pick<ReactPaint, 'registerEvent'> }) => {
  const [fields, setFields] = useState<Field[]>([])

  useEffect(() => {
    const frameTimes: number[] = []
    const draws: FrameMeasure[] = []
    const lastDraws: Partial<Record<CanvasLayer, FrameMeasure>> = {}
    let gesture: GestureMeasure | undefined
    let maxFps = 0
    let lastRefresh = 0
    let request = 0

    const refresh = () => {
      const intervals = frameTimes.slice(1).map((time, index) => time - frameTimes[index]!)
      const longestFrame = Math.max(0, ...intervals)
      let frames = '-'
      if (intervals.length) {
        const span = frameTimes[frameTimes.length - 1]! - frameTimes[0]!
        const fps = Math.round((intervals.length * 1000) / span)
        if (span >= MIN_WINDOW_FOR_MAX_MS) maxFps = Math.max(maxFps, fps)
        frames = `${fps} fps · max ${maxFps || '-'} · longest ${Math.round(longestFrame)} ms`
      }
      const getLayerDraws = (layer: CanvasLayer) => draws.filter(draw => draw.layer === layer)
      setFields([
        // a stutter of the last second stands out
        { term: 'Frames', value: frames, isSlow: longestFrame > SLOW_FRAME_MS },
        { term: 'Shapes layer', value: formatLayer(getLayerDraws('shapes'), lastDraws.shapes) },
        { term: 'Selection layer', value: formatLayer(getLayerDraws('selection'), lastDraws.selection) },
        { term: 'Shapes', value: formatShapes(lastDraws.shapes) },
        { term: 'Canvas', value: formatCanvas(lastDraws.shapes) },
        ...formatGesture(gesture)
      ])
    }

    const onFrame = (now: number) => {
      request = requestAnimationFrame(onFrame)
      frameTimes.push(now)
      // the frames and the draws of the last second only
      while (frameTimes[0]! < now - WINDOW_MS) frameTimes.shift()
      while (draws.length && draws[0]!.startTime < now - WINDOW_MS) draws.shift()
      if (now - lastRefresh >= REFRESH_MS) {
        lastRefresh = now
        refresh()
      }
    }
    request = requestAnimationFrame(onFrame)

    const stopFrames = paint.registerEvent('frameDrawn', frame => {
      draws.push(frame)
      lastDraws[frame.layer] = frame
    })
    const stopGestures = paint.registerEvent('gestureMeasured', measure => {
      gesture = measure
    })
    return () => {
      cancelAnimationFrame(request)
      stopFrames()
      stopGestures()
    }
  }, [paint])

  return (
    <section aria-label='Performance'>
      <dl style={panelStyle}>
        {fields.map(({ term, value, isSlow }) => (
          <Fragment key={term}>
            <dt style={termStyle}>{term}</dt>
            <dd style={isSlow ? slowValueStyle : valueStyle}>{value}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  )
}
