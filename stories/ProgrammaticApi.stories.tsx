import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ReactNode, useEffect, useState } from 'react'
import { Canvas, GRID_PRESETS, type ReactPaint, type ShapeEntity, usePaintState, useReactPaint } from '../src/index'
import './customEditor.css'

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset>
    <legend>{title}</legend>
    {children}
  </fieldset>
)

/** Every operation of the editor, driven from the code: the shapes of the selection, or else all the shapes */
const ApiPanel = ({ paint }: { paint: ReactPaint }) => {
  const { actions } = paint
  const selectedIds = usePaintState(paint, state => state.selectedShapeIds)
  const shapeIds = usePaintState(paint, state => state.shapes.map(shape => shape.id).join(','))
  const allIds = shapeIds ? shapeIds.split(',') : []
  const targetIds = selectedIds.length ? selectedIds : allIds
  const firstId = targetIds[0]
  const [log, setLog] = useState<{ id: number; text: string }[]>([])

  useEffect(() => {
    let count = 0
    const addLog = (text: string) => {
      const id = count++
      setLog(previous => [{ id, text }, ...previous].slice(0, 5))
    }
    const unregisterClick = paint.registerEvent('shapeClicked', (shape: ShapeEntity, { canvasPosition }) =>
      addLog(`clicked ${shape.type} at ${canvasPosition.map(Math.round).join(', ')}`)
    )
    // what a synchronization would send: the changed shapes only
    const unregisterData = paint.registerEvent('dataChanged', (_data, source, { added, updated, removed, reordered }) =>
      addLog(`${source}: ${added.length} added, ${updated.length} updated, ${removed.length} removed${reordered ? ', reordered' : ''}`)
    )
    return () => {
      unregisterClick()
      unregisterData()
    }
  }, [paint])

  const addSample = () =>
    // a single step of the history for the three shapes
    actions.addShapes(
      [
        { type: 'rect', x: 60, y: 60, width: 160, height: 100, style: { fillColor: 'yellow' }, data: { label: 'box' } },
        { type: 'text', x: 280, y: 80, value: ['Created', 'from code'], fontSize: 28 },
        {
          type: 'polygon',
          points: [
            [80, 260],
            [200, 220],
            [240, 330]
          ],
          style: { fillColor: 'green' }
        }
      ],
      { select: true }
    )

  return (
    <div className='custom-editor-side'>
      <Group title='Shapes'>
        <button type='button' onClick={addSample}>
          add shapes
        </button>
        <button type='button' disabled={!firstId} onClick={() => firstId && actions.updateShapes([{ id: firstId, x: 20, y: 20 }])}>
          move first to 20, 20
        </button>
        <button type='button' disabled={!targetIds.length} onClick={() => actions.removeShapes(targetIds)}>
          remove
        </button>
      </Group>
      <Group title='Transformations'>
        <button type='button' onClick={() => actions.translateShapes(targetIds, [20, 0])}>
          translate →
        </button>
        <button type='button' onClick={() => actions.rotateShapes(targetIds, Math.PI / 12)}>
          rotate 15°
        </button>
        <button
          type='button'
          onClick={() => {
            const bounds = paint.getBounds(targetIds)
            if (bounds) actions.resizeShapes(targetIds, { ...bounds, width: bounds.width * 1.2, height: bounds.height * 1.2 })
          }}
        >
          scale 120%
        </button>
        <button type='button' onClick={() => actions.transformShapes(targetIds, 'flipHorizontally')}>
          flip
        </button>
      </Group>
      <Group title='Style and order'>
        <button type='button' onClick={() => actions.setShapesStyle(targetIds, { strokeColor: 'red', lineWidth: 4 }, { updateTool: true })}>
          red stroke
        </button>
        <button type='button' disabled={!firstId} onClick={() => firstId && actions.setShapeIndex(firstId, allIds.length - 1)}>
          send first to back
        </button>
        <button type='button' onClick={() => actions.reorderShapes([...allIds].reverse())}>
          reverse order
        </button>
      </Group>
      <Group title='Selection and text'>
        <button type='button' onClick={actions.selectAllShapes}>
          select all
        </button>
        <button type='button' onClick={actions.clearSelection}>
          clear selection
        </button>
        <button
          type='button'
          onClick={() => {
            const text = paint.getState().shapes.find(shape => shape.type === 'text')
            if (text) actions.editText(text.id)
          }}
        >
          edit a text
        </button>
      </Group>
      <Group title='View'>
        <button type='button' onClick={() => actions.zoomTo(2, { center: [150, 150] })}>
          zoom 200%
        </button>
        <button type='button' onClick={() => actions.panBy([50, 0])}>
          pan →
        </button>
        <button type='button' disabled={!targetIds.length} onClick={() => actions.zoomToShapes(targetIds, { padding: 20 })}>
          fit shapes
        </button>
        <button type='button' onClick={actions.resetZoom}>
          reset zoom
        </button>
        <button type='button' onClick={() => actions.setGridGap(GRID_PRESETS.medium)}>
          grid
        </button>
      </Group>
      <Group title='Options and history'>
        <button type='button' onClick={() => actions.setOptions({ size: 'infinite', canZoom: 'always' })}>
          infinite canvas
        </button>
        <button type='button' onClick={actions.resetOptions}>
          reset options
        </button>
        <button type='button' onClick={actions.resetSettings}>
          reset settings
        </button>
        <button type='button' onClick={actions.undo}>
          undo
        </button>
        <button type='button' onClick={actions.redo}>
          redo
        </button>
        <button type='button' onClick={() => actions.exportPicture({ format: 'jpeg', quality: 0.9 })}>
          export JPEG
        </button>
      </Group>
      <output>
        {log.map(line => (
          <div key={line.id}>{line.text}</div>
        ))}
      </output>
    </div>
  )
}

const ProgrammaticApi = () => {
  const paint = useReactPaint({ width: 600, height: 400 })

  return (
    <div ref={paint.scopeRef} className='custom-editor'>
      <div className='custom-editor-content'>
        <Canvas paint={paint} />
        <ApiPanel paint={paint} />
      </div>
    </div>
  )
}

const meta = {
  title: 'React Paint/Programmatic API',
  component: ProgrammaticApi,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof ProgrammaticApi>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Everything the editor does, driven from the code without the `Editor` component: shapes are created with `addShapes`, updated with `updateShapes`, transformed with `translateShapes`, `rotateShapes` and `resizeShapes`, styled with `setShapesStyle`, ordered with `setShapeIndex` and `reorderShapes`. `paint.batch` gathers several actions in one step of the history, `zoomToShapes` fits shapes in the view, `shapeClicked` tells which shape is clicked, and `dataChanged` gives the shapes added, updated and removed.'
      },
      source: {
        code: `const paint = useReactPaint()

// one step of the history for the whole batch
const rectId = paint.batch(() => {
  const [id] = paint.actions.addShapes([
    { type: 'rect', x: 60, y: 60, width: 160, height: 100, style: { fillColor: 'yellow' }, data: { label: 'box' } },
    { type: 'text', x: 280, y: 80, value: ['Created', 'from code'], fontSize: 28 }
  ])
  paint.actions.rotateShapes([id], Math.PI / 12)
  paint.actions.setShapesStyle([id], { strokeColor: 'red', lineWidth: 4 })
  return id
})

paint.actions.updateShapes([{ id: rectId, x: 20, y: 20 }])
paint.actions.zoomTo(2, { center: [150, 150] })
paint.actions.zoomToShapes([rectId], { padding: 20 })

paint.registerEvent('shapeClicked', (shape, { canvasPosition }) => console.log(shape.data, canvasPosition))
paint.registerEvent('dataChanged', (data, source, { added, updated, removed }) => console.log(added, updated, removed))`
      }
    }
  }
}
