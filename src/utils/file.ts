import _ from 'lodash/fp'
import { DrawableShape, DrawableShapeJson, ExportDataType, Point, ShapeEnum } from 'types/Shapes'
import { addDefaultAndTempShapeProps, buildDataToExport } from './data'
import { drawShape } from './draw'

export const fetchAndStringify = (url: string) => {
  return fetch(url)
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

const encodeObjectToString = (objectToEncode: unknown) => {
  return 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(objectToEncode))
}

export const getCanvasImage = (
  shapes: DrawableShape[],
  canvasOffset: Point,
  width: number,
  height: number,
  selectionPadding: number
) => {
  const newCanvas = document.createElement('canvas')
  newCanvas.width = width
  newCanvas.height = height
  const ctx = newCanvas.getContext('2d')
  if (!ctx) return ''
  ctx.clearRect(0, 0, width, height)
  for (let i = shapes.length - 1; i >= 0; i--) {
    drawShape(ctx, shapes[i], 1, canvasOffset, selectionPadding)
  }
  return newCanvas.toDataURL('image/png')
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

export const decodeImportedData = async (shapesForJson: ExportDataType) => {
  const promisesArray: Promise<void>[] = []
  const jsonShapes = shapesForJson.shapes
  const shapes: DrawableShape[] = _.flow(
    _.map((shape: DrawableShapeJson) => {
      if (!_.includes(shape.type, ShapeEnum)) return null
      if (shape.type === ShapeEnum.picture) {
        const img = new Image()
        const newPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => {
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
        } else {
          img.src = shape.src
        }

        return addDefaultAndTempShapeProps({
          ...shape,
          img
        })
      }
      return addDefaultAndTempShapeProps(shape)
    }),
    _.compact
  )(jsonShapes)

  await Promise.all(promisesArray)
  return shapes
}
