import type { Meta, StoryObj } from '@storybook/react-vite'
import { Collaboration } from './Collaboration'

const meta = {
  title: 'Use cases/Collaboration',
  component: Collaboration,
  parameters: {
    layout: 'centered',
    docs: {
      // in its own frame, the width of the two users follows the one of the page: inline, they overflow it
      story: { inline: false, iframeHeight: 450 },
      description: {
        component:
          'Two users draw together in real time: each one has an instance of their own, with its selection, its tool, its zoom and its history, and applies the changes of the other one with `actions.applyChanges`, sent in JSON through a fake network. Each user undoes their own changes only. See Real-time collaboration in the API Reference for the details.'
      }
    }
  },
  // the same component is tested in Tests/Examples/Collaboration
  tags: ['autodocs', '!dev', '!test'],
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
  // an infinite drawing, zoomed and scrolled by each user on their own
  const options = { size: 'infinite', canZoom: 'always' } as const
  const alice = useReactPaint({ shapes: SHARED_SHAPES, options })
  const bob = useReactPaint({ shapes: SHARED_SHAPES, options })
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
