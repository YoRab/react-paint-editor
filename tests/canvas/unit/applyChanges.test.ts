import type { PaintStore } from '@canvas/store/paintStore'
import type { DataChanges } from '@canvas/types/editor'
import type { ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import { describe, expect, it, vi } from 'vitest'
import { createLoadedStore, FakeImage, getRootIds, RECTS, stubPath2D } from './helpers'

stubPath2D()
vi.stubGlobal('Image', FakeImage)

const SHAPES: ShapeInput[] = RECTS.map((rect, index) => ({ ...rect, id: `r${index}` }))

const PICTURE_SRC = 'data:image/png;base64,AAAA'

type Transport = (changes: DataChanges) => DataChanges

/** Through the network: the changes are plain data */
const throughJson: Transport = changes => JSON.parse(JSON.stringify(changes))

/**
 * Sends the changes of the user of a store to the other one, like the Collaboration story: the changes of a gesture as they
 * come, and the steps of the history, saved there too. The changes received are remote: they are not sent back. They are
 * received as soon as they are sent, unless `deliver` holds them
 */
const sendChanges = (from: PaintStore, to: PaintStore, transport: Transport, deliver: (receive: () => void) => void = receive => receive()) => {
  from.registerEvent('shapesChanged', (_shapes, source, changes) => {
    if (source === 'user') {
      const received = transport(changes)
      deliver(() => to.actions.applyChanges(received, { save: false }))
    }
  })
  from.registerEvent('dataChanged', (_data, source, changes) => {
    if (source === 'user') {
      const received = transport(changes)
      deliver(() => to.actions.applyChanges(received))
    }
  })
}

const createPair = async (shapes: ShapeInput[] = SHAPES, transport: Transport = changes => changes) => {
  const alice = await createLoadedStore({}, shapes)
  const bob = await createLoadedStore({}, shapes)
  sendChanges(alice, bob, transport)
  sendChanges(bob, alice, transport)
  return { alice, bob }
}

type Pair = Awaited<ReturnType<typeof createPair>>

const expectSameDrawing = ({ alice, bob }: Pair) => expect(bob.getCurrentData()).toEqual(alice.getCurrentData())

const getSelectedIds = (store: PaintStore) => store.getEditorState().selectedShapeIds

const position = (store: PaintStore, id: string) => {
  const { x, y } = store.getShape(id) as ShapeEntity<'rect'>
  return [x, y]
}

const getStyle = (store: PaintStore, id: string) => (store.getShape(id) as ShapeEntity<'rect'>).style

/**
 * Two instances behind a network with latency: the changes sent, written in JSON, are received when they are delivered,
 * so that both users change the drawing at once
 */
const createDelayedPair = async () => {
  const queue: (() => void)[] = []
  const alice = await createLoadedStore({}, SHAPES)
  const bob = await createLoadedStore({}, SHAPES)
  sendChanges(alice, bob, throughJson, receive => queue.push(receive))
  sendChanges(bob, alice, throughJson, receive => queue.push(receive))
  const deliver = () => {
    while (queue.length) queue.shift()!()
  }
  return { alice, bob, deliver }
}

/** The actions of the test: each one is done by one of the instances, after which both draw the same */
const runScenario = (pair: Pair) => {
  const { alice, bob } = pair
  const steps: [string, () => void][] = [
    ['add', () => alice.actions.addShapes([{ ...RECTS[0]!, id: 'n1', x: 50 } as ShapeInput])],
    ['add a text', () => bob.actions.addShapes([{ type: 'text', id: 't1', x: 10, y: 10, value: ['Hello'] }])],
    ['update', () => bob.actions.updateShapes([{ id: 'r1', x: 200, data: { checked: true } }])],
    ['update the text', () => alice.actions.updateShapes([{ id: 't1', value: ['Hello', 'world'] }])],
    ['translate', () => alice.actions.translateShapes(['r0'], [5, 5])],
    ['remove', () => bob.actions.removeShapes(['r2'])],
    ['duplicate', () => alice.actions.duplicateShapes(['r0'])],
    ['style', () => bob.actions.setShapesStyle(['r0'], { strokeColor: 'blue' })],
    ['move first', () => alice.actions.moveShapes(['r1'], 'first')],
    ['reorder', () => bob.actions.reorderShapes([...getRootIds(bob)].reverse())],
    ['set the index', () => alice.actions.setShapeIndex('r0', 1)],
    ['group', () => alice.actions.groupShapes(['r0', 'r1'])],
    ['rename the group', () => bob.actions.updateShapes([{ id: getRootIds(bob).find(id => id.startsWith('group'))!, name: 'G' }])],
    ['rotate the group', () => alice.actions.rotateShapes([getRootIds(alice).find(id => id.startsWith('group'))!], 0.5)],
    ['group the group', () => bob.actions.groupShapes([getRootIds(bob).find(id => id.startsWith('group'))!, 'n1'])],
    ['dissolve the inner group', () => alice.actions.removeShapes(['r0'])],
    ['ungroup', () => bob.actions.ungroupShapes(getRootIds(bob).filter(id => id.startsWith('group')))],
    ['undo', () => alice.actions.undo()],
    ['undo there', () => bob.actions.undo()],
    ['redo', () => bob.actions.redo()],
    ['clear', () => alice.actions.clearCanvas()]
  ]
  for (const [name, step] of steps) {
    step()
    expect(bob.getCurrentData(), name).toEqual(alice.getCurrentData())
  }
}

describe('applyChanges', () => {
  it('keeps two instances drawing the same, whatever the changes', async () => {
    runScenario(await createPair())
  })

  it('keeps them drawing the same through JSON', async () => {
    runScenario(await createPair(SHAPES, throughJson))
  })

  it('sends a drawing loaded by the user, which the other one cannot undo', async () => {
    const pair = await createPair(SHAPES, throughJson)
    const { alice, bob } = pair
    bob.actions.translateShapes(['r0'], [5, 5])
    await alice.actions.loadData(
      {
        shapes: [
          { ...RECTS[0]!, id: 'loaded' },
          { type: 'text', id: 'title', x: 10, y: 10, value: ['New'] }
        ]
      },
      { source: 'user' }
    )
    expect(getRootIds(bob)).toEqual(['loaded', 'title'])
    expectSameDrawing(pair)
    expect(alice.getEditorState().history.canUndo).toBe(false)
    // the step of Bob moved a shape which is no longer there: it is passed
    expect(bob.getEditorState().history.canUndo).toBe(true)
    bob.actions.undo()
    expect(bob.getEditorState().history.canUndo).toBe(false)
    expect(getRootIds(bob)).toEqual(['loaded', 'title'])
    expectSameDrawing(pair)
  })

  it('shows the changes of a gesture before they are saved, then saves them without a step', async () => {
    const pair = await createPair()
    const { alice, bob } = pair
    const bobData = vi.fn()
    bob.registerEvent('dataChanged', bobData)
    alice.actions.translateShapes(['r0'], [10, 0], { save: false })
    expectSameDrawing(pair)
    expect(bobData).not.toHaveBeenCalled()

    alice.actions.saveShapes()
    expectSameDrawing(pair)
    // saved by Bob, but it is a step of Alice only
    expect(bobData).toHaveBeenCalledTimes(1)
    expect(bobData.mock.calls[0]![1]).toBe('remote')
    expect(bob.getEditorState().history.canUndo).toBe(false)
    // Alice undoes it, for both of them
    alice.actions.undo()
    expect(position(bob, 'r0')).toEqual([100, 100])
    expectSameDrawing(pair)
  })

  it('does not send back the changes received', async () => {
    const { alice, bob } = await createPair()
    const aliceApply = vi.spyOn(alice.actions, 'applyChanges')
    const bobApply = vi.spyOn(bob.actions, 'applyChanges')
    alice.actions.translateShapes(['r0'], [10, 0])
    // the change of the shapes, then the step saved
    expect(bobApply).toHaveBeenCalledTimes(2)
    expect(aliceApply).not.toHaveBeenCalled()
  })

  it('changes nothing when the changes are applied again', async () => {
    const alice = await createLoadedStore({}, SHAPES)
    const bob = await createLoadedStore({}, SHAPES)
    const received: DataChanges[] = []
    alice.registerEvent('dataChanged', (_data, _source, changes) => received.push(changes))
    alice.actions.groupShapes(['r0', 'r1'])
    alice.actions.translateShapes(['r2'], [10, 0])
    for (const changes of received) bob.actions.applyChanges(changes)
    const { shapes, history } = bob.getState().document

    const onData = vi.fn()
    bob.registerEvent('dataChanged', onData)
    for (const changes of received) bob.actions.applyChanges(changes)
    expect(bob.getState().document.shapes).toBe(shapes)
    expect(bob.getState().document.history).toBe(history)
    expect(onData).not.toHaveBeenCalled()
    expect(bob.getCurrentData()).toEqual(alice.getCurrentData())
  })

  it('ignores the shapes and the groups it does not have', async () => {
    const store = await createLoadedStore({}, SHAPES)
    const { shapes } = store.getState().document
    store.actions.applyChanges({
      added: [],
      updated: [],
      removed: [{ ...RECTS[0]!, id: 'unknown' }],
      reordered: false,
      order: [{ parentId: 'unknown-group', ids: ['r0', 'r1'] }]
    })
    expect(store.getState().document.shapes).toBe(shapes)
  })

  it('puts a shape received without a place in the foreground, and a group with its shapes', async () => {
    const store = await createLoadedStore({}, SHAPES)
    store.actions.applyChanges({
      added: [
        { ...RECTS[0]!, id: 'alone' },
        {
          type: 'group',
          id: 'g',
          shapes: [
            { ...RECTS[1]!, id: 'g1' },
            { ...RECTS[2]!, id: 'g2' }
          ]
        }
      ] as DataChanges['added'],
      updated: [],
      removed: [],
      reordered: false,
      order: []
    })
    expect(getRootIds(store)).toEqual(['alone', 'g', 'r0', 'r1', 'r2'])
    expect((store.getShape('g') as ShapeEntity<'group'>).shapes.map(shape => shape.id)).toEqual(['g1', 'g2'])
  })

  it('throws without changing anything when a shape is invalid', async () => {
    const store = await createLoadedStore({}, SHAPES)
    const { shapes } = store.getState().document
    const invalid = { added: [{ id: 'x', type: 'rect' }], updated: [], removed: [{ id: 'r0' }], reordered: false, order: [] }
    expect(() => store.actions.applyChanges(invalid as unknown as DataChanges)).toThrow(/react-paint applyChanges: invalid shape at index 0/)
    expect(store.getState().document.shapes).toBe(shapes)
  })

  it('keeps the selection on the shapes received, and leaves the shapes removed', async () => {
    const { alice, bob } = await createPair()
    bob.actions.selectShapes(['r1'])
    alice.actions.translateShapes(['r1'], [10, 0])
    expect(getSelectedIds(bob)).toEqual(['r1'])
    expect(bob.getEditorState().selectedShapes[0]).toBe(bob.getShape('r1'))
    alice.actions.removeShapes(['r1'])
    expect(getSelectedIds(bob)).toEqual([])
  })

  it('keeps the image of a picture while its source is the same, and loads a new one', async () => {
    const pair = await createPair([...SHAPES, { type: 'picture', id: 'p', x: 0, y: 0, width: 100, height: 100, src: PICTURE_SRC }])
    const { alice, bob } = pair
    const image = (bob.getShape('p') as ShapeEntity<'picture'>).img
    alice.actions.translateShapes(['p'], [10, 0])
    expect((bob.getShape('p') as ShapeEntity<'picture'>).img).toBe(image)

    const onLoaded = vi.fn()
    bob.registerEvent('pictureLoaded', onLoaded)
    alice.actions.updateShapes([{ id: 'p', src: `${PICTURE_SRC}BBBB` }])
    expect((bob.getShape('p') as ShapeEntity<'picture'>).img).not.toBe(image)
    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ id: 'p' })))
    expectSameDrawing(pair)
  })
})

describe('local history', () => {
  it('undoes and redoes only the steps of the user, on the changes of the other one', async () => {
    const pair = await createPair()
    const { alice, bob } = pair
    alice.actions.translateShapes(['r0'], [10, 0])
    bob.actions.translateShapes(['r1'], [0, 10])
    alice.actions.translateShapes(['r2'], [10, 0])

    alice.actions.undo()
    expect([position(bob, 'r0'), position(bob, 'r1'), position(bob, 'r2')]).toEqual([
      [110, 100],
      [300, 110],
      [500, 100]
    ])
    expectSameDrawing(pair)
    alice.actions.undo()
    expect([position(bob, 'r0'), position(bob, 'r1')]).toEqual([
      [100, 100],
      [300, 110]
    ])
    expect(alice.getEditorState().history.canUndo).toBe(false)
    expectSameDrawing(pair)

    bob.actions.undo()
    expect(position(alice, 'r1')).toEqual([300, 100])
    expect(bob.getEditorState().history.canUndo).toBe(false)
    expectSameDrawing(pair)

    alice.actions.redo()
    alice.actions.redo()
    bob.actions.redo()
    expect([position(bob, 'r0'), position(bob, 'r1'), position(bob, 'r2')]).toEqual([
      [110, 100],
      [300, 110],
      [510, 100]
    ])
    expectSameDrawing(pair)
  })

  it('keeps the fields changed by the other one on a shape whose step is undone', async () => {
    const pair = await createPair()
    const { alice, bob } = pair
    const style = getStyle(bob, 'r0')
    bob.actions.setShapesStyle(['r0'], { strokeColor: 'blue' })
    alice.actions.translateShapes(['r0'], [10, 0])
    alice.actions.setShapesStyle(['r0'], { fillColor: 'red' })

    bob.actions.undo()
    expect(position(alice, 'r0')).toEqual([110, 100])
    expect(getStyle(alice, 'r0')).toMatchObject({ strokeColor: style?.strokeColor, fillColor: 'red' })
    expectSameDrawing(pair)
  })

  it('keeps the shapes added by the other one when a step is undone', async () => {
    const pair = await createPair()
    const { alice, bob } = pair
    bob.actions.addShapes([{ ...RECTS[0]!, id: 'R', x: 50 } as ShapeInput])
    alice.actions.addShapes([{ ...RECTS[1]!, id: 'S', x: 60 } as ShapeInput])
    bob.actions.undo()
    expect(getRootIds(alice)).toEqual(['S', 'r0', 'r1', 'r2'])
    expectSameDrawing(pair)

    // a group undone keeps them too
    bob.actions.groupShapes(['r1', 'r2'])
    alice.actions.addShapes([{ ...RECTS[2]!, id: 'T', x: 70 } as ShapeInput])
    bob.actions.undo()
    expect(getRootIds(alice)).toEqual(['T', 'S', 'r0', 'r1', 'r2'])
    expectSameDrawing(pair)
  })

  it('passes the steps left without effect, when they are undone or redone', async () => {
    const pair = await createPair()
    const { alice, bob } = pair
    bob.actions.translateShapes(['r0'], [10, 0])
    bob.actions.translateShapes(['r1'], [10, 0])
    alice.actions.removeShapes(['r1'])

    bob.actions.undo()
    expect(position(alice, 'r0')).toEqual([100, 100])
    expect(bob.getEditorState().history.canUndo).toBe(false)
    expectSameDrawing(pair)

    bob.actions.redo()
    expect(position(alice, 'r0')).toEqual([110, 100])
    expect(bob.getEditorState().history.canRedo).toBe(true)
    const shapes = bob.getState().document.shapes
    bob.actions.redo()
    expect(bob.getEditorState().history.canRedo).toBe(false)
    expect(bob.getState().document.shapes).toBe(shapes)
    expectSameDrawing(pair)
  })

  it('leaves out of a step the changes of a gesture received meanwhile, and does not send them back', async () => {
    const pair = await createPair(SHAPES, throughJson)
    const { alice, bob } = pair
    const aliceApply = vi.spyOn(alice.actions, 'applyChanges')
    // Bob saves a step while Alice drags a shape
    alice.actions.translateShapes(['r0'], [10, 0], { save: false })
    bob.actions.translateShapes(['r1'], [0, 10])
    expect(aliceApply.mock.calls.flatMap(([changes]) => changes.updated.map(({ shape }) => shape.id))).toEqual(['r1', 'r1'])
    alice.actions.translateShapes(['r0'], [10, 0], { save: false })
    alice.actions.saveShapes()
    expectSameDrawing(pair)

    bob.actions.undo()
    expect([position(alice, 'r0'), position(alice, 'r1')]).toEqual([
      [120, 100],
      [300, 100]
    ])
    expectSameDrawing(pair)
    // the step of Alice starts before her gesture
    alice.actions.undo()
    expect(position(bob, 'r0')).toEqual([100, 100])
    expectSameDrawing(pair)
  })

  it('cancels a gesture of the user, keeping the changes received during it', async () => {
    const pair = await createPair()
    const { alice, bob } = pair
    bob.actions.selectShapes(['r0'])
    bob.setSelectionMode({
      mode: 'translate',
      cursorStartPosition: [0, 0],
      originalShape: bob.getState().document.selectedShape!,
      selectedShapesLengthAtMouseDown: 1,
      hasBeenDuplicated: false,
      dateStart: 0
    })
    bob.actions.translateShapes(['r0'], [10, 0], { save: false })
    alice.actions.translateShapes(['r1'], [0, 10])
    expect(bob.cancelGesture()).toBe(true)
    expect([position(bob, 'r0'), position(bob, 'r1')]).toEqual([
      [100, 100],
      [300, 110]
    ])
    expectSameDrawing(pair)
  })

  it('gives the same objects to a user alone', async () => {
    const store = await createLoadedStore({}, SHAPES)
    const initial = store.getState().document.shapes
    store.actions.translateShapes(['r0'], [10, 0])
    const moved = store.getState().document.shapes
    store.actions.undo()
    expect(store.getState().document.shapes).toBe(initial)
    store.actions.redo()
    expect(store.getState().document.shapes).toBe(moved)
  })
})

describe('concurrent changes', () => {
  it('keeps the changes of different fields of a shape made at once', async () => {
    const { alice, bob, deliver } = await createDelayedPair()
    alice.actions.translateShapes(['r0'], [10, 0])
    bob.actions.setShapesStyle(['r0'], { strokeColor: 'blue' })
    deliver()
    expect(position(bob, 'r0')).toEqual([110, 100])
    expect(getStyle(alice, 'r0')?.strokeColor).toBe('blue')
    expect(bob.getCurrentData()).toEqual(alice.getCurrentData())
  })

  it('keeps the shapes added at once, in the same order once their list changes again', async () => {
    const { alice, bob, deliver } = await createDelayedPair()
    alice.actions.addShapes([{ ...RECTS[0]!, id: 'A' } as ShapeInput])
    bob.actions.addShapes([{ ...RECTS[1]!, id: 'B' } as ShapeInput])
    deliver()
    expect([...getRootIds(alice)].sort()).toEqual(['A', 'B', 'r0', 'r1', 'r2'])
    expect([...getRootIds(bob)].sort()).toEqual(['A', 'B', 'r0', 'r1', 'r2'])

    alice.actions.moveShapes(['r2'], 'first')
    deliver()
    expect(getRootIds(bob)).toEqual(getRootIds(alice))
    expect(bob.getCurrentData()).toEqual(alice.getCurrentData())
  })

  it('removes a shape moved at once by the other one', async () => {
    const { alice, bob, deliver } = await createDelayedPair()
    alice.actions.translateShapes(['r0'], [10, 0])
    bob.actions.removeShapes(['r0'])
    deliver()
    expect(getRootIds(alice)).toEqual(['r1', 'r2'])
    expect(bob.getCurrentData()).toEqual(alice.getCurrentData())
  })
})
