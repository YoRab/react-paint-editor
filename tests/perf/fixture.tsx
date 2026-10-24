// The only file of the benchmark that depends on the public API of the library:
// scenarios drive the app with DOM events and read its state through `getState`.

import { Profiler, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Canvas,
  Editor,
  type EditorState,
  type ReactPaint,
  type ShapeInput,
  type UseReactPaintOptions,
  usePaintState,
  useReactPaint
} from '../../src/index'
import { nextFrame, type Recorder, waitFor } from './metrics'

export type PerfApp = {
  getState: () => EditorState
  /** Number of dataChanged events received, when they are listened */
  getDataEvents: () => number
  unmount: () => void
}

type MountOptions = {
  shapes: ShapeInput[]
  options: UseReactPaintOptions | undefined
  recorder: Recorder
  /** Listens to dataChanged, like an automatic save */
  listenData?: boolean | undefined
}

type HostProps = MountOptions & {
  paintRef: { current: ReactPaint | undefined }
  dataEvents: { count: number }
}

const SIBLING_ITEMS = Array.from({ length: 150 }, (_, index) => index)

/** Stands for the UI of the consumer, around the editor */
const HeavySibling = ({ recorder }: { recorder: Recorder }) => {
  recorder.counters.siblingRenders++
  return (
    <div style={{ fontSize: 6 }}>
      {SIBLING_ITEMS.map(item => (
        <span key={item}>
          <b>{item}</b>
        </span>
      ))}
    </div>
  )
}

/** A component of the consumer subscribed to one slice of the state */
const HistoryProbe = ({ paint }: { paint: ReactPaint }) => {
  const history = usePaintState(paint, state => state.history)
  return <output>{history.canUndo ? 'can undo' : 'nothing to undo'}</output>
}

const Host = ({ shapes, options, recorder, listenData, paintRef, dataEvents }: HostProps) => {
  recorder.counters.hostRenders++
  const paint = useReactPaint({ shapes, options })
  paintRef.current = paint

  useEffect(() => {
    if (!listenData) return
    return paint.registerEvent('dataChanged', () => {
      dataEvents.count++
    })
  }, [paint, listenData, dataEvents])

  return (
    <>
      <Profiler id='editor' onRender={recorder.onRender}>
        <Editor paint={paint}>
          <Profiler id='canvas' onRender={recorder.onRender}>
            <Canvas paint={paint} />
          </Profiler>
        </Editor>
      </Profiler>
      <Profiler id='sibling' onRender={recorder.onRender}>
        <HeavySibling recorder={recorder} />
      </Profiler>
      <Profiler id='probe' onRender={recorder.onRender}>
        <HistoryProbe paint={paint} />
      </Profiler>
    </>
  )
}

export const mountApp = async ({ shapes, options, recorder, listenData }: MountOptions): Promise<PerfApp> => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const paintRef: HostProps['paintRef'] = { current: undefined }
  const dataEvents = { count: 0 }
  const getState = () => paintRef.current!.getState()

  root.render(
    <Profiler id='root' onRender={recorder.onRender}>
      <Host shapes={shapes} options={options} recorder={recorder} listenData={listenData} paintRef={paintRef} dataEvents={dataEvents} />
    </Profiler>
  )

  await waitFor(() => paintRef.current?.getState().shapes.length === shapes.length, 'shapes loaded')
  await waitFor(() => getState().view.displayWidth > 0 && !!container.querySelector('[data-testid="draw-canvas"]'), 'canvas sized')
  await nextFrame()

  return {
    getState,
    getDataEvents: () => dataEvents.count,
    unmount: () => {
      root.unmount()
      container.remove()
    }
  }
}
