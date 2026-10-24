import { DATA_FILE_MAX_SIZE, type PictureSrcResolver, type UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE, PICTURE_LOAD_TIMEOUT, PICTURE_MAX_SIZE } from '@canvas/constants/picture'
import type { ExportImageFormat, ExportImageOptions } from '@canvas/types/editor'
import type { Point, ShapeEntity } from '@canvas/types/Shapes'
import { createDetachedContext, getUnscaledCanvasSize, initCanvasContext, transformCanvas } from '@canvas/utils/canvas'
import { buildDataToExport } from '@canvas/utils/data'
import { drawShape } from '@canvas/utils/shapes'
import { getBoundingRect } from '@canvas/utils/trigo'

export const addSizeAndConvertSvgToObjectUrl = (svgFileContent: string): string => {
  const parser = new DOMParser()
  const result = parser.parseFromString(svgFileContent, 'text/xml')
  const inlineSVG = result.getElementsByTagName('svg')[0]
  if (!inlineSVG) throw new Error('The SVG of the picture is invalid')
  const svgWidth = inlineSVG.getAttribute('width')
  const svgHeight = inlineSVG.getAttribute('height')

  let svgContentToConvert: string
  if (svgWidth || svgHeight) {
    svgContentToConvert = svgFileContent
  } else {
    const viewBox = inlineSVG.getAttribute('viewBox') ?? `0 0 ${PICTURE_DEFAULT_SIZE} ${PICTURE_DEFAULT_SIZE}`
    const [, , width, height] = viewBox.split(' ')
    inlineSVG.setAttribute('width', width ?? `${PICTURE_DEFAULT_SIZE}`)
    inlineSVG.setAttribute('height', height ?? `${PICTURE_DEFAULT_SIZE}`)
    svgContentToConvert = new XMLSerializer().serializeToString(inlineSVG)
  }
  const blob = new Blob([svgContentToConvert], { type: 'image/svg+xml' })
  return URL.createObjectURL(blob)
}

export const isSvg = (fileOrUrl: File | string) => (fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl).includes('.svg')

/**
 * Kind of the source of a picture, which decides how it is loaded: an image data URL or a blob URL is loaded as it is, SVG
 * markup is turned into a blob URL, a URL of the web is fetched. Other sources, like other data URLs or javascript:, are
 * refused: the sources may come from data drawn by someone else
 */
type PictureSource = { kind: 'direct' } | { kind: 'svg' } | { kind: 'remote'; url: string } | { kind: 'refused' }

export const getPictureSource = (src: string): PictureSource => {
  // the cheap checks come first: a data URL can weigh megabytes
  if (/^data:/i.test(src)) return /^data:image\//i.test(src) ? { kind: 'direct' } : { kind: 'refused' }
  if (/^blob:/i.test(src)) return { kind: 'direct' }
  if (src.includes('<svg')) return { kind: 'svg' }
  if (!src || typeof document === 'undefined') return { kind: 'refused' }
  try {
    // relative and protocol-relative URLs are fetched like the others
    const url = new URL(src, document.baseURI)
    return url.protocol === 'http:' || url.protocol === 'https:' ? { kind: 'remote', url: url.href } : { kind: 'refused' }
  } catch {
    return { kind: 'refused' }
  }
}

/**
 * Fetches a picture of the web, without the cookies nor the address of the page, and returns a blob URL of its content: an
 * image of another origin would prevent the export of the canvas. The blob URL has the origin of the page: it gets the type
 * of an image, or none, never one that a browser would display as a page
 */
const fetchPicture = async (url: string, signal: AbortSignal): Promise<string> => {
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal })
  if (!response.ok) throw new Error(`The picture could not be fetched (${response.status})`)
  const type = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
  const isImageType = type.startsWith('image/')
  if (type === 'image/svg+xml' || (!isImageType && isSvg(url))) return addSizeAndConvertSvgToObjectUrl(await response.text())
  return URL.createObjectURL(new Blob([await response.blob()], { type: isImageType ? type : 'application/octet-stream' }))
}

/** URL set in the image of a source: a URL of the web goes through the resolver of the consumer, then is fetched */
const getPictureUrl = async (src: string, resolvePictureSrc: PictureSrcResolver | undefined, signal: AbortSignal): Promise<string> => {
  const source = getPictureSource(src)
  switch (source.kind) {
    case 'direct':
      return src
    case 'svg':
      return URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }))
    case 'refused':
      throw new Error('The source of the picture is not supported')
    case 'remote': {
      const resolved = resolvePictureSrc ? await resolvePictureSrc(source.url) : source.url
      if (typeof resolved !== 'string') throw new Error('The source of the picture is refused')
      const resolvedSource = getPictureSource(resolved)
      if (resolvedSource.kind !== 'remote') throw new Error('The resolved source of the picture must be an http(s) URL')
      return fetchPicture(resolvedSource.url, signal)
    }
  }
}

/** Revokes a blob URL, without parsing the other URLs: a data URL can weigh megabytes */
const revokeBlobUrl = (url: string | undefined) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const downloadFile = (content: string, fileName: string) => {
  const a = document.createElement('a')
  a.href = content
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** Encoded images, computed once per image: the data are exported on each change of the drawing */
const base64Images = new WeakMap<HTMLImageElement, string>()

/** The image encoded in a data URL, or undefined when it cannot be encoded: it is not loaded, or comes from another origin */
export const getBase64Image = (img: HTMLImageElement): string | undefined => {
  // an image which is not loaded yet is encoded later
  if (!img.complete || img.width === 0) return undefined
  const cached = base64Images.get(img)
  if (cached !== undefined) return cached
  const ctx = createDetachedContext()
  if (!ctx) return undefined
  ctx.canvas.width = img.width
  ctx.canvas.height = img.height
  try {
    ctx.drawImage(img, 0, 0)
    const dataURL = ctx.canvas.toDataURL('image/png')
    base64Images.set(img, dataURL)
    return dataURL
  } catch {
    return undefined
  }
}

/**
 * Whether the source of a picture is exported encoded from its image: only a blob URL, which does not outlive the page, is
 * encoded. The other sources are loaded again as they are, see getPictureSource
 */
export const isSourceEncodedOnExport = (src: string) => /^blob:/i.test(src)

/**
 * Loads the source of a picture in its image: a URL of the web is fetched first, so that the canvas can still be exported.
 * Fails after a delay, or when the image is too large. The blob URL of the image is revoked once it is loaded or has failed
 */
export const loadPicture = (img: HTMLImageElement, src: string, resolvePictureSrc?: PictureSrcResolver): Promise<void> => {
  // aborted at the end of the loading: it stops the fetch, and tells that a URL came too late
  const controller = new AbortController()
  let url: string | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  return new Promise<void>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout while loading images')), PICTURE_LOAD_TIMEOUT)
    img.onload = () => {
      if (img.naturalWidth > PICTURE_MAX_SIZE || img.naturalHeight > PICTURE_MAX_SIZE) {
        reject(new Error(`The picture is larger than ${PICTURE_MAX_SIZE} pixels`))
      } else {
        resolve()
      }
    }
    img.onerror = () => reject(new Error('Some images could not be loaded'))
    getPictureUrl(src, resolvePictureSrc, controller.signal).then(pictureUrl => {
      if (controller.signal.aborted) {
        revokeBlobUrl(pictureUrl)
      } else {
        url = pictureUrl
        img.src = pictureUrl
      }
    }, reject)
  }).finally(() => {
    controller.abort()
    clearTimeout(timeoutId)
    // the image lives with the picture: its handlers would keep the loading alive
    img.onload = null
    img.onerror = null
    revokeBlobUrl(url)
  })
}

const encodeObjectToString = (objectToEncode: unknown) => {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(objectToEncode))}`
}

const MIME_TYPES: Record<ExportImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
}

const getShapesDataUrl = ({
  shapes,
  settings,
  options
}: {
  shapes: ShapeEntity[]
  settings: UtilsSettings
  options: Omit<ExportImageOptions, 'view'>
}): string => {
  const newCanvas = document.createElement('canvas')
  const ctx = newCanvas.getContext('2d')
  if (!ctx) throw new Error('No context found for canvas')

  const { realHeight: height, realWidth: width } = settings.canvasSize
  newCanvas.width = width
  newCanvas.height = height
  ctx.clearRect(0, 0, width, height)
  initCanvasContext(ctx)

  const format = options.format ?? 'png'
  // a JPEG has no transparency: its background is white unless another color is given
  const backgroundColor = options.backgroundColor ?? (format === 'jpeg' ? 'white' : undefined)
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
  }
  if (options.backgroundImage) {
    transformCanvas(ctx, settings)
    // the background image covers the drawing
    ctx.drawImage(options.backgroundImage, 0, 0, settings.drawingSize.width, settings.drawingSize.height)
    ctx.restore()
  }
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(ctx, shapes[i]!, settings)
  }
  return newCanvas.toDataURL(MIME_TYPES[format], options.quality)
}

/** Settings printing an area of the drawing at the scale 1, from the point at the given offset */
const getUnscaledPrintSettings = (settings: UtilsSettings, offset: Point, { width, height }: UtilsSettings['drawingSize']): UtilsSettings => ({
  ...settings,
  canvasOffset: offset,
  canvasZoom: 1,
  canvasSize: { ...getUnscaledCanvasSize(width, height), scaleRatioWithNoZoom: 1 }
})

export const getCanvasImage = ({
  shapes,
  settings,
  options = {}
}: {
  shapes: ShapeEntity[]
  settings: UtilsSettings
  options?: ExportImageOptions | undefined
}): string => {
  const { view = 'defaultView', ...imageOptions } = options
  if (view === 'fitToShapes' && !shapes.length) throw new Error('No image found to export')

  if (view === 'fitToShapes') {
    const box = getBoundingRect(shapes.map(shape => shape.computed.boundingBox))
    const printSettings = getUnscaledPrintSettings(settings, [-box.x, -box.y], box)
    return getShapesDataUrl({ shapes, settings: printSettings, options: imageOptions })
  }

  // the drawing from its origin, whatever the visible area
  if (view === 'defaultView') {
    const printSettings = getUnscaledPrintSettings(settings, [0, 0], settings.drawingSize)
    return getShapesDataUrl({ shapes, settings: printSettings, options: imageOptions })
  }

  const printSettings = {
    ...settings,
    canvasSize: {
      ...settings.canvasSize,
      width: settings.canvasSize.realWidth,
      height: settings.canvasSize.realHeight,
      scaleRatio: settings.canvasZoom,
      scaleRatioWithNoZoom: 1
    }
  }
  return getShapesDataUrl({ shapes, settings: printSettings, options: imageOptions })
}

export const encodeShapesInString = (shapes: ShapeEntity[], width: number, height: number): string => {
  const dataToExport = buildDataToExport(shapes, width, height)
  return encodeObjectToString(dataToExport)
}

/** Content of a file as a data URL, read without blocking the page */
export const readFileAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

export const decodeJson = async (file: File) => {
  if (file.size > DATA_FILE_MAX_SIZE) throw new Error(`The file is larger than ${DATA_FILE_MAX_SIZE / 1024 / 1024} MB`)
  return new Promise<unknown>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      const result = event.target?.result
      if (!result) return reject(new Error('Impossible de récupérer les données du fichier'))
      try {
        const json = JSON.parse(result as string)
        resolve(json)
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
