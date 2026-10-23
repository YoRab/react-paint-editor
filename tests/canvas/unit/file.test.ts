import { createPaintStore } from '@canvas/store/paintStore'
import { decodeJson } from '@canvas/utils/file'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadedStore, RECTS, stubPath2D } from './helpers'

/**
 * @vitest-environment jsdom
 */

const DATA_URL_PREFIX = 'data:text/plain;charset=utf-8,'

const jsonFile = (content: unknown) => new File([JSON.stringify(content)], 'drawing.json', { type: 'application/json' })

stubPath2D()

/** The links clicked to download a file: jsdom does not download them */
const downloads: { href: string; download: string }[] = []

beforeEach(() => {
  downloads.length = 0
  // jsdom has no canvas: the store measures the texts without it
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ href: this.href, download: this.download })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('decodeJson', () => {
  it('reads the JSON content of a file', async () => {
    await expect(decodeJson(jsonFile({ shapes: [] }))).resolves.toEqual({ shapes: [] })
  })

  it('refuses an empty file, or a file which is not JSON', async () => {
    await expect(decodeJson(new File([''], 'empty.json'))).rejects.toThrow()
    await expect(decodeJson(new File(['{ shapes'], 'broken.json'))).rejects.toThrow('Invalid JSON file')
  })
})

describe('project files', () => {
  it('loads a project file in place of the drawing, without history', async () => {
    const store = await createLoadedStore()
    store.actions.removeShapes([store.getState().document.shapes[0]!.id])
    await store.actions.loadFile(jsonFile({ shapes: [{ ...RECTS[0]!, id: 'loaded' }] }))
    expect(store.getState().document.shapes.map(shape => shape.id)).toEqual(['loaded'])
    expect(store.getEditorState().history.canUndo).toBe(false)
  })

  it('keeps the drawing when the file is not a project', async () => {
    const store = await createLoadedStore()
    await expect(store.actions.loadFile(new File(['not json'], 'drawing.json'))).rejects.toThrow('Invalid JSON file')
    expect(store.getState().document.shapes).toHaveLength(3)
  })

  it('downloads the drawing in a JSON file, which loads it again', async () => {
    const store = await createLoadedStore({ width: 800, height: 400 })
    store.actions.exportData()
    store.actions.exportData({ fileName: 'mine.json' })
    expect(downloads.map(({ download }) => download)).toEqual(['drawing.json', 'mine.json'])

    const { href } = downloads[0]!
    expect(href.startsWith(DATA_URL_PREFIX)).toBe(true)
    const content = JSON.parse(decodeURIComponent(href.slice(DATA_URL_PREFIX.length)))
    expect(content.config).toEqual({ width: 800, height: 400 })
    expect(content.shapes).toEqual(store.getCurrentData().shapes)

    const otherStore = createPaintStore()
    await otherStore.actions.loadData(content)
    expect(otherStore.getCurrentData().shapes).toEqual(store.getCurrentData().shapes)
    // the link does not stay in the page
    expect(document.querySelector('a')).toBeNull()
  })
})
