import { DATA_FILE_MAX_SIZE, type UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE, PICTURE_LOAD_TIMEOUT, PICTURE_MAX_SIZE } from '@canvas/constants/picture'
import { createPaintStore, type PaintStore } from '@canvas/store/paintStore'
import type { DrawableShape, Point, ShapeEntity, ShapeInput } from '@canvas/types/Shapes'
import type { CustomTool, CustomToolInput } from '@canvas/types/tools'
import { decodeJson, getPictureSource, hasPictureFailed, loadPicture } from '@canvas/utils/file'
import { createShape, refreshShape, sizeShapeOnClick } from '@canvas/utils/shapes'
import { fitPictureToImage, resizePicture } from '@canvas/utils/shapes/picture'
import { buildAvailableTools } from '@canvas/utils/tools'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadedStore, FakeImage, MEASURE_CONTEXT, RECTS, stubPath2D } from './helpers'

/**
 * @vitest-environment jsdom
 */

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

const SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>"

const picture = (src: string): ShapeInput => ({ type: 'picture', x: 0, y: 0, width: 100, height: 100, src })

/** Settings without selection padding: the boxes of the stickers are read as they are drawn */
const NO_PADDING = { selectionPadding: 0, gridGap: 0 } as UtilsSettings

/** Response of the fetch of a picture */
const pictureResponse = ({ type = 'image/png', ok = true, body = 'image' } = {}) => ({
  ok,
  status: ok ? 200 : 404,
  headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? type : null) },
  blob: async () => new Blob([body], { type }),
  text: async () => body
})

const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => pictureResponse())
const createObjectURL = vi.fn((_blob: Blob) => `blob:test/${createObjectURL.mock.calls.length}`)
const revokeObjectURL = vi.fn()

const absolute = (url: string) => new URL(url, document.baseURI).href

stubPath2D()
vi.stubGlobal('Image', FakeImage)
vi.stubGlobal('fetch', fetchMock)
Object.assign(URL, { createObjectURL, revokeObjectURL })

beforeEach(() => {
  FakeImage.fails = () => false
  FakeImage.size = () => 100
  // jsdom has no canvas: the store measures the texts without it
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  // the mocks get their first implementation back
  fetchMock.mockReset()
  createObjectURL.mockReset()
  revokeObjectURL.mockReset()
})

describe('getPictureSource', () => {
  it('fetches the URLs of the web, relative and protocol-relative ones included', () => {
    expect(getPictureSource('https://example.com/a.png')).toEqual({ kind: 'remote', url: 'https://example.com/a.png' })
    expect(getPictureSource('//example.com/a.png')).toEqual({ kind: 'remote', url: absolute('//example.com/a.png') })
    expect(getPictureSource('/images/a.png')).toEqual({ kind: 'remote', url: absolute('/images/a.png') })
  })

  it('loads the images of data URLs, blob URLs and SVG markup without fetching them', () => {
    expect(getPictureSource(PNG_DATA_URL)).toEqual({ kind: 'direct' })
    expect(getPictureSource(`data:image/svg+xml,${SVG}`)).toEqual({ kind: 'direct' })
    expect(getPictureSource('blob:http://localhost/1')).toEqual({ kind: 'direct' })
    expect(getPictureSource(SVG)).toEqual({ kind: 'svg' })
  })

  it('refuses the other sources', () => {
    expect(getPictureSource('javascript:alert(1)')).toEqual({ kind: 'refused' })
    expect(getPictureSource('data:text/html,<script>alert(1)</script>')).toEqual({ kind: 'refused' })
    expect(getPictureSource('file:///etc/passwd')).toEqual({ kind: 'refused' })
    expect(getPictureSource('http://[')).toEqual({ kind: 'refused' })
    expect(getPictureSource('')).toEqual({ kind: 'refused' })
  })
})

describe('loadPicture', () => {
  it('fetches a remote picture without the cookies nor the address of the page, and revokes its blob URL once loaded', async () => {
    const img = new Image()
    await loadPicture(img, '//example.com/a.png')
    expect(fetchMock).toHaveBeenCalledWith(absolute('//example.com/a.png'), {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: expect.any(AbortSignal)
    })
    expect(img.src).toMatch(/^blob:/)
    expect(revokeObjectURL).toHaveBeenCalledWith(img.src)
  })

  it('never gives a blob URL a type that a browser would display as a page', async () => {
    fetchMock.mockImplementation(async () => pictureResponse({ type: 'text/html', body: '<script>alert(1)</script>' }))
    FakeImage.fails = () => true
    await expect(loadPicture(new Image(), 'https://example.com/a.png')).rejects.toThrow()
    expect(createObjectURL.mock.lastCall?.[0].type).toBe('application/octet-stream')
    // the blob URL is revoked when the image fails too
    expect(revokeObjectURL).toHaveBeenCalledWith(createObjectURL.mock.results[0]?.value)
  })

  it('loads SVG markup from a blob URL of its content', async () => {
    const img = new Image()
    await loadPicture(img, SVG)
    const blob = createObjectURL.mock.lastCall![0]
    expect(blob.type).toBe('image/svg+xml')
    await expect(blob.text()).resolves.toBe(SVG)
    expect(img.src).toBe(createObjectURL.mock.results[0]?.value)
  })

  it('gives a fetched SVG without size the size of its view box, or the default size', async () => {
    const sizes: string[] = []
    for (const svg of ["<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'/>", "<svg xmlns='http://www.w3.org/2000/svg'/>"]) {
      fetchMock.mockImplementation(async () => pictureResponse({ type: 'image/svg+xml', body: svg }))
      await loadPicture(new Image(), 'https://example.com/a.svg')
      const content = await createObjectURL.mock.lastCall![0].text()
      sizes.push(`${content.match(/width="(\d+)"/)?.[1]}×${content.match(/height="(\d+)"/)?.[1]}`)
    }
    expect(sizes).toEqual(['30×20', `${PICTURE_DEFAULT_SIZE}×${PICTURE_DEFAULT_SIZE}`])
  })

  it('revokes the blob URL of a picture fetched after the delay', async () => {
    vi.useFakeTimers()
    let respond: (response: ReturnType<typeof pictureResponse>) => void = () => undefined
    fetchMock.mockImplementation(() => new Promise(resolve => (respond = resolve)))
    const img = new Image()
    const loading = expect(loadPicture(img, 'https://slow.example/a.png')).rejects.toThrow('Timeout')
    await vi.advanceTimersByTimeAsync(PICTURE_LOAD_TIMEOUT)
    await loading

    respond(pictureResponse())
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith(createObjectURL.mock.results[0]?.value))
    expect(img.src).toBe('')
  })

  it('fails when the picture cannot be fetched', async () => {
    fetchMock.mockImplementation(async () => pictureResponse({ ok: false }))
    await expect(loadPicture(new Image(), 'https://example.com/missing.png')).rejects.toThrow('404')
  })

  it('refuses the unsupported sources without any request', async () => {
    await expect(loadPicture(new Image(), 'javascript:alert(1)')).rejects.toThrow('not supported')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches the URL given by resolvePictureSrc, or refuses the picture when it gives null', async () => {
    const resolvePictureSrc = vi.fn((url: string) => (url.includes('blocked') ? null : `https://proxy.example/?url=${encodeURIComponent(url)}`))
    await loadPicture(new Image(), 'https://example.com/a.png', resolvePictureSrc)
    expect(resolvePictureSrc).toHaveBeenCalledWith('https://example.com/a.png')
    expect(fetchMock.mock.lastCall?.[0]).toBe('https://proxy.example/?url=https%3A%2F%2Fexample.com%2Fa.png')

    fetchMock.mockClear()
    await expect(loadPicture(new Image(), 'https://blocked.example/a.png', resolvePictureSrc)).rejects.toThrow('refused')
    await expect(loadPicture(new Image(), 'https://example.com/a.png', () => 'javascript:alert(1)')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses an image larger than the limit', async () => {
    FakeImage.size = () => PICTURE_MAX_SIZE + 1
    await expect(loadPicture(new Image(), PNG_DATA_URL)).rejects.toThrow('larger')
  })

  it('fails after a delay, and stops the fetch', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(() => new Promise(() => undefined))
    const loading = expect(loadPicture(new Image(), 'https://slow.example/a.png')).rejects.toThrow('Timeout')
    await vi.advanceTimersByTimeAsync(PICTURE_LOAD_TIMEOUT)
    await loading
    expect(fetchMock.mock.lastCall?.[1]?.signal?.aborted).toBe(true)
  })
})

describe('loaded data', () => {
  it('keeps the pictures which cannot be loaded, with a warning, drawn as a frame', async () => {
    const store = await createLoadedStore({}, [RECTS[0]!, { ...picture('javascript:alert(1)'), id: 'bad' }, picture(PNG_DATA_URL)])
    expect(store.getState().document.shapes.map(shape => shape.type)).toEqual(['rect', 'picture', 'picture'])
    expect(hasPictureFailed((store.getShape('bad') as ShapeEntity<'picture'>).img)).toBe(true)
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('goes through resolvePictureSrc and keeps the source of the shapes, the refused ones too', async () => {
    const resolvePictureSrc = vi.fn((url: string) => (url.startsWith('https://allowed.example/') ? url : null))
    const store = await createLoadedStore({ options: { resolvePictureSrc } }, [
      picture('https://allowed.example/a.png'),
      picture('https://tracker.example/pixel.png')
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.getCurrentData().shapes?.map(shape => (shape as { src: string }).src)).toEqual([
      'https://allowed.example/a.png',
      'https://tracker.example/pixel.png'
    ])
  })

  it('is used by addPicture, which fails when the picture is refused', async () => {
    const store = createPaintStore({ options: { resolvePictureSrc: () => null } })
    await expect(store.actions.addPicture('https://example.com/a.png')).rejects.toThrow('refused')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the source of a picture which cannot be encoded in the exported data', async () => {
    const src = 'blob:http://localhost/1'
    const store = await createLoadedStore({}, [picture(src)])
    // the canvas of an image of another origin cannot be read
    const canvas = document.createElement('canvas')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ canvas, drawImage: vi.fn() } as unknown as RenderingContext)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new DOMException('The canvas has been tainted', 'SecurityError')
    })
    const listener = vi.fn()
    store.registerEvent('dataChanged', listener)
    store.actions.addShapes([RECTS[0]!])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.lastCall?.[0].shapes[1]).toMatchObject({ type: 'picture', src })
  })

  it('redraws a picture added by the consumer once its image is loaded, without a step in the history', async () => {
    const store = createPaintStore()
    const [id] = store.actions.addShapes([picture(PNG_DATA_URL)])
    const added = store.getShape(id!)
    const historyLength = store.getState().document.history.states.length
    await vi.waitFor(() => expect(store.getShape(id!)).not.toBe(added))
    expect(store.getShape(id!)).toMatchObject({ type: 'picture', img: { src: PNG_DATA_URL, complete: true } })
    expect(store.getState().document.history.states).toHaveLength(historyLength)
  })

  it('loads a new image when the source of a picture is changed, and warns when it fails', async () => {
    const otherSrc = 'data:image/png;base64,b3RoZXI='
    const store = await createLoadedStore({}, [{ ...picture(PNG_DATA_URL), id: 'pic' }])
    const { img } = store.getShape('pic') as { img: HTMLImageElement }
    store.actions.updateShapes([{ id: 'pic', src: otherSrc }])
    const updated = store.getShape('pic') as { img: HTMLImageElement }
    expect(updated.img).not.toBe(img)
    await vi.waitFor(() => expect((store.getShape('pic') as { img: HTMLImageElement }).img.complete).toBe(true))
    expect(updated.img.src).toBe(otherSrc)

    FakeImage.fails = () => true
    const failed = vi.fn()
    store.registerEvent('pictureLoadFailed', failed)
    store.actions.updateShapes([{ id: 'pic', src: PNG_DATA_URL }])
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('pic could not be loaded'), expect.any(Error)))
    // the shape is kept with its new source
    expect(store.getCurrentData().shapes?.[0]).toMatchObject({ src: PNG_DATA_URL })
    expect(failed).toHaveBeenCalledTimes(1)
    expect(failed).toHaveBeenCalledWith(store.getShape('pic'), expect.any(Error))
  })

  it('resizes a picture with other shapes, keeping its proportions', async () => {
    const store = await createLoadedStore({}, [
      { type: 'picture', id: 'pic', x: 0, y: 0, width: 200, height: 100, src: PNG_DATA_URL },
      { ...RECTS[0]!, id: 'rect' }
    ])
    // from (0, 0) to (200, 200)
    store.actions.resizeShapes(['pic', 'rect'], { x: 0, y: 0, width: 400, height: 400 })
    expect(store.getShape('pic')).toMatchObject({ x: 0, y: 0, width: 400, height: 200 })
    expect(store.getShape('rect')).toMatchObject({ x: 200, y: 200, width: 200, height: 200 })
  })

  it('refuses a data file larger than the limit without reading it', async () => {
    const file = new File(['{}'], 'drawing.json')
    Object.defineProperty(file, 'size', { value: DATA_FILE_MAX_SIZE + 1 })
    const readAsText = vi.spyOn(FileReader.prototype, 'readAsText')
    await expect(decodeJson(file)).rejects.toThrow('larger')
    expect(readAsText).not.toHaveBeenCalled()
  })
})

describe('picture load events', () => {
  const listen = (store: PaintStore) => {
    const loaded = vi.fn()
    const failed = vi.fn()
    store.registerEvent('pictureLoaded', loaded)
    store.registerEvent('pictureLoadFailed', failed)
    return { loaded, failed }
  }

  it('emits pictureLoaded with the redrawn picture once a picture added by addShapes is loaded', async () => {
    const store = createPaintStore()
    const { loaded, failed } = listen(store)
    const [id] = store.actions.addShapes([picture(PNG_DATA_URL)])
    expect(loaded).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1))
    expect(loaded.mock.lastCall?.[0]).toBe(store.getShape(id!))
    expect(store.getShape(id!)).toMatchObject({ img: { complete: true } })
    expect(failed).not.toHaveBeenCalled()
  })

  it('loads the pictures of a group added by addShapes, and draws them in the group', async () => {
    const store = createPaintStore()
    const { loaded } = listen(store)
    const [groupId] = store.actions.addShapes([{ type: 'group', shapes: [{ ...picture(PNG_DATA_URL), id: 'p' }, RECTS[0]!] }])
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1))
    expect(loaded.mock.lastCall?.[0]).toBe(store.getShape('p'))
    expect((store.getShape(groupId!) as ShapeEntity<'group'>).shapes[0]).toBe(store.getShape('p'))
  })

  it('emits pictureLoadFailed for a picture added by addShapes which cannot be loaded, and keeps the picture', async () => {
    FakeImage.fails = () => true
    const store = createPaintStore()
    const { loaded, failed } = listen(store)
    const [id] = store.actions.addShapes([picture(PNG_DATA_URL)])
    const added = store.getShape(id!)
    const historyLength = store.getState().document.history.states.length

    await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(1))
    expect(failed).toHaveBeenCalledWith(store.getShape(id!), expect.any(Error))
    expect(store.getCurrentData().shapes).toHaveLength(1)
    expect(loaded).not.toHaveBeenCalled()
    // replaced by a copy, so that it is drawn again with its frame, without a step in the history
    expect(store.getShape(id!)).not.toBe(added)
    expect(store.getState().document.history.states).toHaveLength(historyLength)
  })

  it('emits nothing for a picture removed, or given another source, before its image is loaded', async () => {
    const otherSrc = 'data:image/png;base64,b3RoZXI='
    FakeImage.fails = src => src === PNG_DATA_URL
    const store = createPaintStore()
    const { loaded, failed } = listen(store)
    const [removed, changed] = store.actions.addShapes([picture(PNG_DATA_URL), picture(PNG_DATA_URL)])
    store.actions.removeShapes([removed!])
    store.actions.updateShapes([{ id: changed!, src: otherSrc }])

    // only the new image of the second picture is reported
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1))
    expect(loaded.mock.lastCall?.[0]).toMatchObject({ id: changed, src: otherSrc })
    // the two images of the first source failed meanwhile
    expect(console.warn).toHaveBeenCalledTimes(2)
    expect(failed).not.toHaveBeenCalled()
  })

  it('emits pictureLoadFailed for each picture of loaded data which cannot be loaded, once the drawing is loaded', async () => {
    const store = createPaintStore()
    const { loaded, failed } = listen(store)
    const seen: { id: string; types: string[]; found: unknown }[] = []
    failed.mockImplementation((shape: ShapeEntity<'picture'>) =>
      seen.push({ id: shape.id, types: store.getState().document.shapes.map(item => item.type), found: store.getShape(shape.id) })
    )

    await store.actions.loadData({
      shapes: [{ ...RECTS[0]!, id: 'rect' }, { ...picture('javascript:alert(1)'), id: 'bad' }, picture(PNG_DATA_URL)]
    })
    expect(seen).toEqual([{ id: 'bad', types: ['rect', 'picture', 'picture'], found: store.getShape('bad') }])
    // the pictures of loaded data are loaded before the promise is resolved
    expect(loaded).not.toHaveBeenCalled()
  })
})

describe('stickers', () => {
  const stickerTool = (ratio?: number): CustomToolInput => ({
    id: 'sticker',
    type: 'picture',
    src: PNG_DATA_URL,
    settings: { opacity: { min: 0, max: 100, step: 1, default: 100 } },
    ...(ratio === undefined ? {} : { ratio })
  })

  /** A sticker as a press draws it: an empty box, with the image of its tool, which may still be loading */
  const emptySticker = (img: HTMLImageElement) =>
    refreshShape(
      { id: 'sticker_1', type: 'picture', x: 100, y: 100, width: 0, height: 0, src: PNG_DATA_URL, img } as DrawableShape & { id: string },
      NO_PADDING
    ) as ShapeEntity<'picture'>

  const loaded = (img: HTMLImageElement) => vi.waitFor(() => expect(img.complete).toBe(true))

  it('loads the image of a sticker tool once it is chosen, and shares it between its stickers', async () => {
    FakeImage.size = () => [200, 100]
    const store = await createLoadedStore({ options: { availableTools: [stickerTool()] } }, [])
    const tool = store.getState().tools.available.find(({ id }) => id === 'sticker')!
    store.setActiveTool(tool)

    const img = store.getStickerImage(PNG_DATA_URL)
    await loaded(img)
    expect(img.naturalWidth).toBe(200)
    // the stickers of the tool share its image: it is never loaded again
    expect(store.getStickerImage(PNG_DATA_URL)).toBe(img)
  })

  it('draws a sticker with the proportions of the image of its tool, or the ratio the tool gives', async () => {
    FakeImage.size = () => [200, 100]
    const img = new Image()
    img.src = PNG_DATA_URL
    await loaded(img)

    const tools = buildAvailableTools([stickerTool(), { ...stickerTool(3), id: 'wide' }])
    const sticker = (id: string, image?: HTMLImageElement) =>
      createShape(MEASURE_CONTEXT, tools.find(tool => tool.id === id)! as Extract<CustomTool, { type: 'picture' }>, [10, 20], NO_PADDING, image)

    expect(sticker('sticker', img)).toMatchObject({ type: 'picture', x: 10, y: 20, width: 0, height: 0, ratio: 2 })
    // the ratio of the tool is kept, even once the image is loaded: the consumer gives the proportions it wants
    expect(sticker('wide', img)).toMatchObject({ ratio: 3 })
    // without the image of its tool, the sticker has no proportions yet: see fitPictureToImage
    expect(sticker('sticker')).not.toHaveProperty('ratio')
  })

  it('keeps the proportions of the image while a sticker is drawn, and draws a square until it is loaded', async () => {
    FakeImage.size = () => [200, 100]
    const img = new Image()
    const sticker = emptySticker(img)
    const dragTo = (to: Point) =>
      resizePicture(
        to,
        sticker,
        { mode: 'resize', anchor: [1, 1], cursorStartPosition: [100, 100], originalShape: sticker, selectedShapesLengthAtMouseDown: 1 },
        NO_PADDING,
        false
      )

    // the image of its tool is not loaded yet: the drag is square, and the sticker has no proportions of its own
    expect(dragTo([300, 300])).toMatchObject({ x: 100, y: 100, width: 200, height: 200 })
    expect(dragTo([300, 300])).not.toHaveProperty('ratio')

    img.src = PNG_DATA_URL
    await loaded(img)
    // the same drag, once the image is loaded: the box keeps its proportions, which the sticker now knows
    expect(dragTo([300, 300])).toMatchObject({ x: 100, y: 100, width: 400, height: 200, ratio: 2 })
  })

  it('fits a sticker drawn before its image inside the box of its drag, once it is loaded', async () => {
    FakeImage.size = () => [200, 100]
    const img = new Image()
    img.src = PNG_DATA_URL
    await loaded(img)

    // the square box of a drag made before the image was loaded
    const square = refreshShape({ ...emptySticker(img), width: 200, height: 200 }, NO_PADDING) as ShapeEntity<'picture'>
    expect(fitPictureToImage(square, NO_PADDING)).toMatchObject({ x: 100, y: 150, width: 200, height: 100, ratio: 2 })
    // an empty box is sized by sizeShapeOnClick, from the proportions it is given here
    expect(fitPictureToImage(emptySticker(img), NO_PADDING)).toMatchObject({ width: 0, height: 0, ratio: 2 })
    expect(sizeShapeOnClick({ ...emptySticker(img), ratio: 2 }, [400, 300], NO_PADDING)).toMatchObject({
      x: 250,
      y: 225,
      width: PICTURE_DEFAULT_SIZE,
      height: PICTURE_DEFAULT_SIZE / 2
    })
    // a picture which already knows its proportions keeps its box: only its image was missing
    const given = refreshShape({ ...emptySticker(img), width: 200, height: 200, ratio: 1 }, NO_PADDING) as ShapeEntity<'picture'>
    expect(fitPictureToImage(given, NO_PADDING)).toMatchObject({ x: 100, y: 100, width: 200, height: 200, ratio: 1 })
  })

  it('gives a picture added without a box the proportions of its image, and keeps the box it is given', async () => {
    FakeImage.size = () => [200, 100]
    const store = createPaintStore()
    const [empty, box] = store.actions.addShapes([
      { type: 'picture', x: 0, y: 0, width: 0, height: 0, src: PNG_DATA_URL },
      { type: 'picture', x: 0, y: 0, width: 300, height: 300, src: PNG_DATA_URL }
    ])

    await vi.waitFor(() => expect(store.getShape(empty!)).toMatchObject({ ratio: 2 }))
    // the box given by the consumer is the one of the picture, whatever its image: it gives its proportions
    expect(store.getShape(box!)).toMatchObject({ x: 0, y: 0, width: 300, height: 300, ratio: 1 })
  })
})
