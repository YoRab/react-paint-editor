import type { UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import { ShapeTypeArray } from '@canvas/constants/shapes'
import { initCanvasContext } from '@canvas/utils/canvas'
import { drawShape, getShapeInfos } from '@canvas/utils/shapes'
import type { DrawableShape, ExportedDrawableShape, Point, ShapeEntity } from '@common/types/Shapes'
import { compact } from '@common/utils/array'
import { addDefaultAndTempShapeProps, buildDataToExport } from '@canvas/utils/data'
import { rotatePoint } from '@canvas/utils/trigo'

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

export const getBase64Image = (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(img, 0, 0)
  const dataURL = canvas.toDataURL('image/png')
  return dataURL
}

export const getStringifiedImage = (shape: DrawableShape<'picture'>) => (shape.src.includes('<svg') ? shape.src : getBase64Image(shape.img))

const encodeObjectToString = (objectToEncode: unknown) => {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(objectToEncode))}`
}

const getShapesDataUrl = ({ shapes, settings }: { shapes: DrawableShape[]; settings: UtilsSettings }): string => {
  const newCanvas = document.createElement('canvas')
  const ctx = newCanvas.getContext('2d')
  if (!ctx) throw new Error('No context found for canvas')

  const { realHeight: height, realWidth: width } = settings.canvasSize
  newCanvas.width = width
  newCanvas.height = height
  ctx.clearRect(0, 0, width, height)
  initCanvasContext(ctx)
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(ctx, shapes[i]!, settings)
  }
  return newCanvas.toDataURL('image/png')
}

export const getCanvasImage = ({
  shapes,
  settings,
  view
}: {
  shapes: DrawableShape[]
  settings: UtilsSettings
  view: 'fitToShapes' | 'defaultView' | 'currentZoom'
}): string => {
  if (view === 'fitToShapes' && !shapes.length) throw new Error('No image found to export')

  if (view === 'fitToShapes') {
    const bordersShapes = shapes.map(shape => {
      const { center, outerBorders } = getShapeInfos(shape, settings)

      const rotatedPoints = (
        [
          [outerBorders.x, outerBorders.y],
          [outerBorders.x + outerBorders.width, outerBorders.y],
          [outerBorders.x + outerBorders.width, outerBorders.y + outerBorders.height],
          [outerBorders.x, outerBorders.y + outerBorders.height]
        ] as Point[]
      ).map(point =>
        rotatePoint({
          point,
          origin: center,
          rotation: shape.rotation
        })
      )
      return {
        minX: Math.min(...rotatedPoints.map(point => point[0])),
        minY: Math.min(...rotatedPoints.map(point => point[1])),
        maxX: Math.max(...rotatedPoints.map(point => point[0])),
        maxY: Math.max(...rotatedPoints.map(point => point[1]))
      }
    })
    const minX = Math.min(...bordersShapes.map(borders => borders.minX))
    const maxX = Math.max(...bordersShapes.map(borders => borders.maxX))

    const minY = Math.min(...bordersShapes.map(borders => borders.minY))
    const maxY = Math.max(...bordersShapes.map(borders => borders.maxY))

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
    return getShapesDataUrl({ shapes, settings: printSettings })
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
    return getShapesDataUrl({ shapes, settings: printSettings })
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
  return getShapesDataUrl({ shapes, settings: printSettings })
}

export const encodeShapesInString = (shapes: DrawableShape[], width: number, height: number) => {
  const dataToExport = buildDataToExport(shapes, width, height)
  return encodeObjectToString(dataToExport)
}

export const decodeJson = async (file: File) => {
  return new Promise<unknown>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      const result = event.target?.result
      if (!result) return reject('Impossible de récupérer les données du fichier')
      const json = JSON.parse(result as string)
      resolve(json)
    }
    reader.readAsText(file)
  })
}

export const decodeImportedData = async (shapesForJson: ExportedDrawableShape[], settings: UtilsSettings) => {
  if (!shapesForJson) return []
  const promisesArray: Promise<void>[] = []

  const shapes: ShapeEntity[] = compact(
    shapesForJson.map(shape => {
      if (!shape || !ShapeTypeArray.includes(shape.type)) return null
      if (shape.type === 'picture') {
        const img = new Image()
        const newPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(img.src)
            resolve()
          }

          img.onerror = () => {
            reject(new Error('Some images could not be loaded'))
          }
        })
        promisesArray.push(newPromise)
        if (shape.src.startsWith('http')) {
          fetchAndStringify(shape.src)
            .then(picData => {
              img.src = picData
            })
            .catch(() => {
              img.src = '' // to trigger onerror
            })
        } else if (shape.src.includes('<svg')) {
          const blob = new Blob([shape.src], { type: 'image/svg+xml' })
          img.src = URL.createObjectURL(blob)
        } else {
          img.src = shape.src
        }

        return addDefaultAndTempShapeProps(
          {
            ...shape,
            img
          },
          settings
        )
      }
      return addDefaultAndTempShapeProps(shape, settings)
    })
  )

  await Promise.all(promisesArray)
  return shapes
}
