import type { Meta, StoryObj } from '@storybook/react-vite'
import { Collaboration } from './collaboration/Collaboration'

const meta = {
  title: 'React Paint/Collaboration',
  component: Collaboration,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'Two users draw together in real time: each one has an instance of their own, with its selection, its tool, its zoom and its history, and applies the changes of the other one.',
          '`shapesChanged` gives the changes of a gesture as they come, `dataChanged` the steps of the history: both are sent, written in JSON like through a network, and applied with `actions.applyChanges`. The changes received are remote, so they are not sent back.',
          'The grid is shared too: `gridChanged` gives it, and `actions.setGridGap` applies it. This event gives no source, so the grid received is not sent back thanks to a flag set while it is applied.',
          'The history is shared: an undo undoes the last step of the instance, which may be a step received from the other user, and the other user receives the undo. The last change wins when both users change the same shape. Showing where the other user is (their selection, their pointer) is up to the application.'
        ].join('\n\n')
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    latency: { control: { type: 'range', min: 0, max: 2000, step: 50 }, description: 'Delay of the fake network, in milliseconds' }
  }
} satisfies Meta<typeof Collaboration>

export default meta
type Story = StoryObj<typeof meta>

export const RealTime: Story = {
  args: {
    latency: 0
  },
  parameters: {
    docs: {
      source: {
        code: `import { useEffect } from 'react'
import { Canvas, type DataChanges, Editor, type ReactPaint, useReactPaint } from '@yorab/react-paint'

/** The instances applying the grid of the other one: gridChanged gives no source, the flag keeps it from being sent back */
const receivingGrid = new WeakSet<ReactPaint>()

/** Sends the changes of the user of an instance to the other one, written in JSON like through a network */
const useSendChanges = (from: ReactPaint, to: ReactPaint, latency: number) => {
  useEffect(() => {
    const send = <T,>(message: T, receive: (message: T) => void) => {
      const json = JSON.stringify(message)
      setTimeout(() => receive(JSON.parse(json)), latency)
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
    // the changes of a gesture as they come, then the step of the history, saved there too.
    // The changes received are 'remote': they are not sent back
    const unregisterLive = from.registerEvent('shapesChanged', (_shapes, source, changes) => {
      if (source === 'user') send(changes, applyChanges(false))
    })
    const unregisterSaved = from.registerEvent('dataChanged', (_data, source, changes) => {
      if (source === 'user') send(changes, applyChanges(true))
    })
    // the grid, emitted while it is set: the grid received is not sent back
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

const Collaboration = ({ latency = 0 }) => {
  // both users start from the same shapes, with the same ids
  const alice = useReactPaint({ shapes: SHARED_SHAPES })
  const bob = useReactPaint({ shapes: SHARED_SHAPES })
  useSendChanges(alice, bob, latency)
  useSendChanges(bob, alice, latency)
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <Editor paint={alice}>
        <Canvas paint={alice} />
      </Editor>
      <Editor paint={bob}>
        <Canvas paint={bob} />
      </Editor>
    </div>
  )
}`,
        language: 'tsx'
      }
    }
  }
}
