import type { UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import type { ExportImageFormat, ExportImageOptions } from '@canvas/types/editor'
import type { DrawableShape, Point, ShapeEntity } from '@canvas/types/Shapes'
import { initCanvasContext, transformCanvas } from '@canvas/utils/canvas'
import { buildDataToExport } from '@canvas/utils/data'
import { drawShape } from '@canvas/utils/shapes'

export const addSizeAndConvertSvgToObjectUrl = (svgFileContent: string): string => {
  const parser = new DOMParser()
  const result = parser.parseFromString(svgFileContent, 'text/xml')
  const inlineSVG = result.getElementsByTagName('svg')[0]
  if (!inlineSVG) return ''
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

export const fetchAndStringify = (url: string) => {
  return isSvg(url)
    ? fetch(url)
        .then(response => response.text())
        .then(svgFileContent => addSizeAndConvertSvgToObjectUrl(svgFileContent))
    : fetch(url)
        .then(response => response.blob())
        .then(myBlob => URL.createObjectURL(myBlob))
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

export const getBase64Image = (img: HTMLImageElement) => {
  const cached = base64Images.get(img)
  if (cached !== undefined) return cached
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(img, 0, 0)
  const dataURL = canvas.toDataURL('image/png')
  // an image which is not loaded yet is encoded again later
  if (img.complete && img.width > 0) base64Images.set(img, dataURL)
  return dataURL
}

/** Source of a picture as exported: an SVG or a data URL is kept, other sources (often revoked blob URLs) are encoded */
export const getStringifiedImage = (shape: DrawableShape<'picture'>) =>
  shape.src.includes('<svg') || shape.src.startsWith('data:') ? shape.src : getBase64Image(shape.img)

const encodeObjectToString = (objectToEncode: unknown) => {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(objectToEncode))}`
}

const MIME_TYPES: Record<ExportImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
}

type DrawOptions = Omit<ExportImageOptions, 'view'> & {
  /** Logical size of the canvas, where the background image is drawn */
  canvasRect: { width: number; height: number }
}

const getShapesDataUrl = ({ shapes, settings, options }: { shapes: ShapeEntity[]; settings: UtilsSettings; options: DrawOptions }): string => {
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
    ctx.drawImage(options.backgroundImage, 0, 0, options.canvasRect.width, options.canvasRect.height)
    ctx.restore()
  }
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(ctx, shapes[i]!, settings)
  }
  return newCanvas.toDataURL(MIME_TYPES[format], options.quality)
}

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
  const drawOptions: DrawOptions = {
    ...imageOptions,
    canvasRect: { width: settings.canvasSize.realWidth, height: settings.canvasSize.realHeight }
  }
  if (view === 'fitToShapes' && !shapes.length) throw new Error('No image found to export')

  if (view === 'fitToShapes') {
    const minX = Math.min(...shapes.map(shape => shape.computed.boundingBox.x))
    const maxX = Math.max(...shapes.map(shape => shape.computed.boundingBox.x + shape.computed.boundingBox.width))
    const minY = Math.min(...shapes.map(shape => shape.computed.boundingBox.y))
    const maxY = Math.max(...shapes.map(shape => shape.computed.boundingBox.y + shape.computed.boundingBox.height))

    const printSettings = {
      ...settings,
      canvasOffset: [-minX, -minY] as Point,
      canvasZoom: 1,
      canvasSize: {
        realWidth: maxX - minX,
        realHeight: maxY - minY,
        width: maxX - minX,
        height: maxY - minY,
        scaleRatio: 1,
        scaleRatioWithNoZoom: 1
      }
    }
    return getShapesDataUrl({ shapes, settings: printSettings, options: drawOptions })
  }

  if (view === 'defaultView') {
    const printSettings = {
      ...settings,
      canvasOffset: [0, 0] as Point,
      canvasZoom: 1,
      canvasSize: {
        ...settings.canvasSize,
        width: settings.canvasSize.realWidth,
        height: settings.canvasSize.realHeight,
        scaleRatio: 1,
        scaleRatioWithNoZoom: 1
      }
    }
    return getShapesDataUrl({ shapes, settings: printSettings, options: drawOptions })
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
  return getShapesDataUrl({ shapes, settings: printSettings, options: drawOptions })
}

export const encodeShapesInString = (shapes: ShapeEntity[], width: number, height: number): string => {
  const dataToExport = buildDataToExport(shapes, width, height)
  return encodeObjectToString(dataToExport)
}

export const decodeJson = async (file: File) => {
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
