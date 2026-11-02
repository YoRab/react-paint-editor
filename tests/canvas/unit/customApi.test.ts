import { SETTINGS_DEFAULT_CUSTOM } from '@canvas/constants/tools'
import { createPaintStore } from '@canvas/store/paintStore'
import type { CustomShapeParams, ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import type { CustomToolInput } from '@canvas/types/tools'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadedStore, stubPath2D } from './helpers'

stubPath2D()

const starPath = vi.fn(({ branches = 5 }: CustomShapeParams) => `M0 0 L${branches} 0 Z`)

const STAR_TOOL: CustomToolInput = {
  id: 'star',
  type: 'custom',
  shape: { viewBox: [0, 0, 10, 10], path: starPath },
  settings: {
    ...SETTINGS_DEFAULT_CUSTOM,
    params: {
      branches: { label: 'Branches', min: 3, max: 24, step: 1, default: 5 },
      depth: { label: 'Creux', min: 10, max: 90, step: 5, default: 50 }
    }
  }
}

const STAR: ShapeInput = {
  type: 'custom',
  id: 'star_1',
  toolId: 'star',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  params: { branches: 5, depth: 50 }
}

const createStarStore = (tools: CustomToolInput[] = [STAR_TOOL], shapes: ShapeInput[] = [STAR]) =>
  createLoadedStore({ options: { availableTools: tools } }, shapes)

const getParams = (store: Awaited<ReturnType<typeof createStarStore>>) => (store.getShape('star_1') as ShapeEntity<'custom'>).params

const getToolParams = (store: Awaited<ReturnType<typeof createStarStore>>) => {
  const tool = store.getState().tools.available.find(({ id }) => id === 'star')
  return tool?.type === 'custom' ? tool.settings.params : undefined
}

beforeEach(() => {
  starPath.mockClear()
})

describe('the parameters of a custom shape', () => {
  it('merges a patch with the parameters of the shape, and draws its path again', async () => {
    const store = await createStarStore()
    store.actions.updateShapes([{ id: 'star_1', params: { branches: 8 } }])
    expect(getParams(store)).toEqual({ branches: 8, depth: 50 })
    expect(starPath).toHaveBeenCalledWith({ branches: 8, depth: 50 })
  })

  it('keeps the value in its tool with updateTool, for the next shapes', async () => {
    const store = await createStarStore()
    store.actions.updateShapes([{ id: 'star_1', params: { branches: 8 } }], { updateTool: true })
    expect(getToolParams(store)?.branches?.default).toBe(8)
    expect(getToolParams(store)?.depth?.default).toBe(50)
  })

  it('does not touch its tool without updateTool', async () => {
    const store = await createStarStore()
    store.actions.updateShapes([{ id: 'star_1', params: { branches: 8 } }])
    expect(getToolParams(store)?.branches?.default).toBe(5)
  })

  it('sets the default of a single parameter of a tool, without touching the shapes', async () => {
    const store = await createStarStore()
    store.actions.updateToolSettings('star', 'params.branches', 9)
    expect(getToolParams(store)?.branches?.default).toBe(9)
    expect(getParams(store)).toEqual({ branches: 5, depth: 50 })
  })

  it('ignores the default of a parameter the tool does not declare', async () => {
    const store = await createStarStore()
    store.actions.updateToolSettings('star', 'params.spikes', 3)
    expect(getToolParams(store)).toEqual(STAR_TOOL.type === 'custom' ? STAR_TOOL.settings.params : undefined)
  })
})

describe('the data of a custom shape', () => {
  it('exports its tool and its parameters, without its definition nor its path', async () => {
    const store = await createStarStore()
    const [exported] = store.getCurrentData().shapes ?? []
    expect(exported).toEqual({
      id: 'star_1',
      type: 'custom',
      toolId: 'star',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      params: { branches: 5, depth: 50 }
    })
  })

  it('refuses a shape given by addShapes whose custom tool is not available', async () => {
    const store = await createStarStore()
    expect(() => store.actions.addShapes([{ ...STAR, id: 'other', toolId: 'heart' }])).toThrow(
      'react-paint addShapes: invalid shape at index 0, no custom tool "heart" draws this shape'
    )
  })

  it('leaves out a loaded shape whose custom tool is not available, and tells it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createPaintStore({ options: { availableTools: [{ type: 'rect', id: 'rect' }] } })
    const loadFailed = vi.fn()
    store.registerEvent('customShapeLoadFailed', loadFailed)
    await store.resetCanvas([STAR, { type: 'rect', id: 'rect_1', x: 0, y: 0, width: 10, height: 10 }])
    expect(store.getState().document.shapes.map(({ id }) => id)).toEqual(['rect_1'])
    expect(loadFailed).toHaveBeenCalledWith(expect.objectContaining({ type: 'custom', toolId: 'star' }))
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('draws the shape of another custom tool when its toolId is patched', async () => {
    const heartPath = vi.fn(() => 'M0 0 L5 5 Z')
    const heartTool: CustomToolInput = {
      id: 'heart',
      type: 'custom',
      shape: { viewBox: [0, 0, 20, 10], path: heartPath },
      settings: SETTINGS_DEFAULT_CUSTOM
    }
    const store = await createStarStore([STAR_TOOL, heartTool])
    store.actions.updateShapes([{ id: 'star_1', toolId: 'heart' }])
    expect(heartPath).toHaveBeenCalled()
    expect(store.getShape('star_1')?.toolId).toBe('heart')
  })
})
