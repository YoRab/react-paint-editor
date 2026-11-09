import { type CSSProperties, useEffect } from 'react'
import { Canvas, type DataChanges, Editor, type ReactPaint, type ShapeInput, useReactPaint } from '../../src/index'

/** Handles of the last rendered instances, driven by the tests */
export const collaborationPaints: { alice: ReactPaint | null; bob: ReactPaint | null } = { alice: null, bob: null }

/** An infinite drawing, which each user can zoom and scroll on their own */
export const COLLABORATION_OPTIONS = { size: 'infinite', canZoom: 'always' } as const

/** The drawing both users start from: the same shapes, with the same ids */
export const SHARED_SHAPES: ShapeInput[] = [
  { type: 'rect', id: 'box', x: 120, y: 120, width: 220, height: 140, style: { fillColor: '#ffd166', strokeColor: '#073b4c', lineWidth: 3 } },
  { type: 'circle', id: 'sun', x: 620, y: 220, radius: 90, style: { fillColor: '#ef476f', strokeColor: '#073b4c', lineWidth: 3 } },
  { type: 'text', id: 'title', x: 360, y: 420, value: ['Draw on either side'], fontSize: 36 }
]

/**
 * The instances applying the grid of the other one: the grid received is not sent back. Unlike the changes of the
 * shapes, gridChanged gives no source, but it is emitted while the grid is set
 */
const receivingGrid = new WeakSet<ReactPaint>()

/**
 * Sends the changes of the user of an instance to the other one, through a fake network: they are written in JSON and
 * received after the latency. The changes of a gesture are shown as they come, and the steps of the history are saved
 * there too, without being steps of the other user: each one undoes their own. The changes received are remote: they are
 * not sent back. The grid is shared too
 */
export const useSendChanges = (from: ReactPaint, to: ReactPaint, latency: number) => {
  useEffect(() => {
    const send = <T,>(message: T, receive: (message: T) => void) => {
      const json = JSON.stringify(message)
      const deliver = () => receive(JSON.parse(json))
      if (latency > 0) setTimeout(deliver, latency)
      else deliver()
    }
    const applyChanges = (save: boolean) => (changes: DataChanges) => to.actions.applyChanges(changes, { save })
    const applyGrid = (gridGap: number) => {
      receivingGrid.add(to)
      try {
        to.actions.setGridGap(gridGap)
      } finally {
        receivingGrid.delete(to)
      }
    }
    const unregisterLive = from.registerEvent('shapesChanged', (_shapes, source, changes) => {
      if (source === 'user') send(changes, applyChanges(false))
    })
    const unregisterSaved = from.registerEvent('dataChanged', (_data, source, changes) => {
      if (source === 'user') send(changes, applyChanges(true))
    })
    const unregisterGrid = from.registerEvent('gridChanged', gridGap => {
      if (!receivingGrid.has(from)) send(gridGap, applyGrid)
    })
    return () => {
      unregisterLive()
      unregisterSaved()
      unregisterGrid()
    }
  }, [from, to, latency])
}

const LAYOUT_STYLE: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 16, width: 'min(1600px, 96vw)' }

const COLUMN_STYLE: CSSProperties = { flex: '1 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }

const TITLE_STYLE: CSSProperties = { margin: 0, font: '600 16px system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }

const User = ({ name, color, paint }: { name: string; color: string; paint: ReactPaint }) => (
  <section aria-label={name} style={COLUMN_STYLE}>
    <h2 style={TITLE_STYLE}>
      <span aria-hidden='true' style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
      {name}
    </h2>
    <Editor paint={paint}>
      <Canvas paint={paint} />
    </Editor>
  </section>
)

export type CollaborationProps = {
  /** Delay of the fake network, in milliseconds */
  latency: number
}

/** Two users, each one with an instance of their own, which applies the changes of the other one */
export const Collaboration = ({ latency }: CollaborationProps) => {
  const alice = useReactPaint({ shapes: SHARED_SHAPES, options: COLLABORATION_OPTIONS })
  const bob = useReactPaint({ shapes: SHARED_SHAPES, options: COLLABORATION_OPTIONS })
  collaborationPaints.alice = alice
  collaborationPaints.bob = bob
  useSendChanges(alice, bob, latency)
  useSendChanges(bob, alice, latency)
  return (
    <div style={LAYOUT_STYLE}>
      <User name='Alice' color='#118ab2' paint={alice} />
      <User name='Bob' color='#06d6a0' paint={bob} />
    </div>
  )
}
