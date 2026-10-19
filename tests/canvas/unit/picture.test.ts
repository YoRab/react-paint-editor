import { DATA_FILE_MAX_SIZE } from '@canvas/constants/app'
import { PICTURE_LOAD_TIMEOUT, PICTURE_MAX_SIZE } from '@canvas/constants/picture'
import { createPaintStore } from '@canvas/store/paintStore'
import type { ShapeInput } from '@canvas/types/Shapes'
import { decodeJson, getPictureSource, loadPicture } from '@canvas/utils/file'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadedStore, RECTS, stubPath2D } from './helpers'

/**
 * @vitest-environment jsdom
 */

/** Images of the tests: they load once their source is set, as large as given by size, or fail when fails says so */
class FakeImage {
  static fails = (_src: string) => false
  static size = (_src: string) => 100
  complete = false
  width = 0
  height = 0
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  source = ''

  get src() {
    return this.source
  }

  set src(value: string) {
    this.source = value
    setTimeout(() => {
      this.complete = true
      if (FakeImage.fails(value)) {
        this.onerror?.()
        return
      }
      this.width = this.height = this.naturalWidth = this.naturalHeight = FakeImage.size(value)
      this.onload?.()
    })
  }
}

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

const SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>"

const picture = (src: string): ShapeInput => ({ type: 'picture', x: 0, y: 0, width: 100, height: 100, src })

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
  it('leaves out the pictures which cannot be loaded, with a warning, and loads the other shapes', async () => {
    const store = await createLoadedStore({}, [RECTS[0]!, picture('javascript:alert(1)'), picture(PNG_DATA_URL)])
    expect(store.getState().document.shapes.map(shape => shape.type)).toEqual(['rect', 'picture'])
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('goes through resolvePictureSrc and keeps the source of the shape', async () => {
    const resolvePictureSrc = vi.fn((url: string) => (url.startsWith('https://allowed.example/') ? url : null))
    const store = await createLoadedStore({ options: { resolvePictureSrc } }, [
      picture('https://allowed.example/a.png'),
      picture('https://tracker.example/pixel.png')
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(store.getCurrentData().shapes?.map(shape => (shape as { src: string }).src)).toEqual(['https://allowed.example/a.png'])
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

  it('refuses a data file larger than the limit without reading it', async () => {
    const file = new File(['{}'], 'drawing.json')
    Object.defineProperty(file, 'size', { value: DATA_FILE_MAX_SIZE + 1 })
    const readAsText = vi.spyOn(FileReader.prototype, 'readAsText')
    await expect(decodeJson(file)).rejects.toThrow('larger')
    expect(readAsText).not.toHaveBeenCalled()
  })
})
